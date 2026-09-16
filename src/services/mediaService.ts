import type { MediaRecord } from '../domain/models.ts';
import { byNewest, listWhere, where } from './firestoreHelpers.ts';
import { apiRequest, putToStorage } from './apiClient.ts';

/**
 * Uploading to R2 from the browser.
 *
 * The original bytes are never touched: no resize, no re-encode, no transcode.
 * A HEIC stays a HEIC at its original size. Anything the gallery needs that is
 * smaller is a separate object beside the original, never a replacement.
 *
 * Large files go up in parts so a phone that loses signal in a marquee can
 * retry the one part that failed rather than the whole two-gigabyte video.
 */

export type UploadPhase = 'queued' | 'uploading' | 'finalizing' | 'done' | 'failed' | 'cancelled';

export interface UploadTask {
  id: string;
  file: File;
  phase: UploadPhase;
  /** 0-100. */
  progress: number;
  error?: string;
  mediaId?: string;
}

interface CreateResponse {
  mode: 'single' | 'multipart';
  objectKey: string;
  uploadId?: string;
  partSize?: number;
  kind: 'IMAGE' | 'VIDEO';
  uploadUrl?: string;
}

export interface UploadTarget {
  albumId?: string;
  guestbookId?: string;
  uploaderName?: string;
  turnstileToken?: string;
}

/** A part that fails is retried a few times before the file is given up on. */
async function withRetry<T>(attempt: () => Promise<T>, tries = 3): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < tries; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastError = err;
      if (i < tries - 1) {
        // Back off a little so a congested connection gets a moment.
        await new Promise((resolve) => setTimeout(resolve, 800 * (i + 1)));
      }
    }
  }

  throw lastError;
}

export async function uploadFile(
  file: File,
  target: UploadTarget,
  onProgress: (percent: number, phase: UploadPhase) => void,
  signal?: AbortSignal
): Promise<{ mediaId: string; objectKey: string }> {
  onProgress(0, 'uploading');

  const session = await apiRequest<CreateResponse>('/api/uploads/create', {
    method: 'POST',
    authenticated: false,
    body: {
      albumId: target.albumId,
      guestbookId: target.guestbookId,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
      uploaderName: target.uploaderName,
      turnstileToken: target.turnstileToken,
    },
  });

  if (session.mode === 'single') {
    await withRetry(() =>
      putToStorage(
        session.uploadUrl!,
        file,
        file.type || 'application/octet-stream',
        (loaded, total) => onProgress(Math.round((loaded / total) * 100), 'uploading'),
        signal
      )
    );

    onProgress(100, 'finalizing');
    return apiRequest<{ mediaId: string; objectKey: string }>('/api/uploads/finalize', {
      method: 'POST',
      authenticated: false,
      body: {
        objectKey: session.objectKey,
        albumId: target.albumId,
        guestbookId: target.guestbookId,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        uploaderName: target.uploaderName,
      },
    });
  }

  // --- multipart ---------------------------------------------------------
  const partSize = session.partSize || 8 * 1024 * 1024;
  const partCount = Math.ceil(file.size / partSize);
  const parts: { partNumber: number; etag: string }[] = [];
  let uploadedBytes = 0;

  try {
    for (let partNumber = 1; partNumber <= partCount; partNumber++) {
      if (signal?.aborted) throw new Error('cancelled');

      const start = (partNumber - 1) * partSize;
      const chunk = file.slice(start, Math.min(start + partSize, file.size));
      const bytesBefore = uploadedBytes;

      const { url } = await apiRequest<{ url: string }>('/api/uploads/multipart/sign-part', {
        method: 'POST',
        authenticated: false,
        body: {
          objectKey: session.objectKey,
          uploadId: session.uploadId,
          partNumber,
          albumId: target.albumId,
          guestbookId: target.guestbookId,
        },
      });

      const { etag } = await withRetry(() =>
        putToStorage(
          url,
          chunk,
          undefined,
          (loaded) => {
            const total = bytesBefore + loaded;
            onProgress(Math.min(99, Math.round((total / file.size) * 100)), 'uploading');
          },
          signal
        )
      );

      parts.push({ partNumber, etag });
      uploadedBytes = bytesBefore + chunk.size;
    }

    onProgress(100, 'finalizing');

    return await apiRequest<{ mediaId: string; objectKey: string }>('/api/uploads/multipart/complete', {
      method: 'POST',
      authenticated: false,
      body: {
        objectKey: session.objectKey,
        uploadId: session.uploadId,
        parts,
        albumId: target.albumId,
        guestbookId: target.guestbookId,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        uploaderName: target.uploaderName,
      },
    });
  } catch (err) {
    // Abandoned parts still occupy storage until R2 expires them, so tell it
    // to drop them now.
    void apiRequest('/api/uploads/multipart/abort', {
      method: 'POST',
      authenticated: false,
      body: { objectKey: session.objectKey, uploadId: session.uploadId },
    }).catch(() => {});
    throw err;
  }
}

export const mediaService = {
  async listForAlbum(albumId: string): Promise<MediaRecord[]> {
    const all = await listWhere<MediaRecord>('albumMedia', [where('albumId', '==', albumId)]);
    return all.sort(byNewest('uploadedAt'));
  },

  async listForClient(clientId: string): Promise<MediaRecord[]> {
    const all = await listWhere<MediaRecord>('albumMedia', [where('clientId', '==', clientId)]);
    return all.sort(byNewest('uploadedAt'));
  },

  /** A short-lived link to the untouched original. */
  async downloadUrl(mediaId: string): Promise<string> {
    const res = await apiRequest<{ url: string }>(`/api/media/${mediaId}/download`);
    return res.url;
  },

  async downloadBatch(ids: string[]): Promise<{ id: string; url?: string; name?: string; error?: string }[]> {
    const res = await apiRequest<{ results: { id: string; url?: string; name?: string; error?: string }[] }>(
      '/api/media/download-batch',
      { method: 'POST', body: { ids } }
    );
    return res.results;
  },

  async remove(mediaId: string): Promise<void> {
    await apiRequest(`/api/media/${mediaId}`, { method: 'DELETE' });
  },
};

/** 842 MB, 12.4 GB — never "883000000 bytes". */
export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value >= 100 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

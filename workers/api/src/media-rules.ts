import { z } from 'zod';

/**
 * What a public uploader is allowed to send. This is the server's copy of the
 * rule — the browser has its own, but only this one counts.
 */

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/tiff',
] as const;

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/3gpp',
  'video/x-m4v',
] as const;

export const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif', 'tif', 'tiff',
  'mp4', 'mov', 'webm', 'mkv', '3gp', 'm4v',
];

/** iOS sometimes reports HEIC as an empty or generic type; fall back to the extension. */
export function classifyMedia(
  mimeType: string,
  filename: string
): { kind: 'IMAGE' | 'VIDEO'; normalizedMime: string } | null {
  const extension = (filename.split('.').pop() || '').toLowerCase();

  if ((IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { kind: 'IMAGE', normalizedMime: mimeType };
  }
  if ((VIDEO_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { kind: 'VIDEO', normalizedMime: mimeType };
  }

  const byExtension: Record<string, { kind: 'IMAGE' | 'VIDEO'; normalizedMime: string }> = {
    heic: { kind: 'IMAGE', normalizedMime: 'image/heic' },
    heif: { kind: 'IMAGE', normalizedMime: 'image/heif' },
    jpg: { kind: 'IMAGE', normalizedMime: 'image/jpeg' },
    jpeg: { kind: 'IMAGE', normalizedMime: 'image/jpeg' },
    png: { kind: 'IMAGE', normalizedMime: 'image/png' },
    webp: { kind: 'IMAGE', normalizedMime: 'image/webp' },
    mov: { kind: 'VIDEO', normalizedMime: 'video/quicktime' },
    mp4: { kind: 'VIDEO', normalizedMime: 'video/mp4' },
    m4v: { kind: 'VIDEO', normalizedMime: 'video/x-m4v' },
    webm: { kind: 'VIDEO', normalizedMime: 'video/webm' },
    '3gp': { kind: 'VIDEO', normalizedMime: 'video/3gpp' },
  };

  return byExtension[extension] || null;
}

export const uploadRequestSchema = z.object({
  albumId: z.string().min(1).max(128).optional(),
  guestbookId: z.string().min(1).max(128).optional(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(128),
  fileSize: z.number().int().positive().max(20 * 1024 * 1024 * 1024),
  uploaderName: z.string().max(120).optional(),
  turnstileToken: z.string().max(4096).optional(),
});

export const signPartSchema = z.object({
  objectKey: z.string().min(1).max(1024),
  uploadId: z.string().min(1).max(512),
  partNumber: z.number().int().min(1).max(10000),
  albumId: z.string().min(1).max(128).optional(),
  guestbookId: z.string().min(1).max(128).optional(),
});

export const completeSchema = z.object({
  objectKey: z.string().min(1).max(1024),
  uploadId: z.string().min(1).max(512),
  parts: z
    .array(z.object({ partNumber: z.number().int().min(1), etag: z.string().min(1).max(256) }))
    .min(1)
    .max(10000),
  albumId: z.string().min(1).max(128).optional(),
  guestbookId: z.string().min(1).max(128).optional(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(128),
  fileSize: z.number().int().positive(),
  uploaderName: z.string().max(120).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().positive().optional(),
});

export const abortSchema = z.object({
  objectKey: z.string().min(1).max(1024),
  uploadId: z.string().min(1).max(512),
});

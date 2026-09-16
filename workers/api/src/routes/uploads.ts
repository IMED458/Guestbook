import { Hono } from 'hono';
import type { Env } from '../env.ts';
import { HttpError, getDocument, writeDocument } from '../google.ts';
import {
  abortSchema,
  classifyMedia,
  completeSchema,
  signPartSchema,
  uploadRequestSchema,
} from '../media-rules.ts';
import {
  abortMultipartUpload,
  albumObjectKey,
  completeMultipartUpload,
  createMultipartUpload,
  guestbookObjectKey,
  presignPut,
  presignUploadPart,
} from '../r2.ts';
import { clientAddress, enforceRateLimit, verifyTurnstile } from '../rate-limit.ts';

/** Anything larger than this is uploaded in parts so a dropout is recoverable. */
const MULTIPART_THRESHOLD = 16 * 1024 * 1024;

interface AlbumDoc {
  clientId: string;
  eventId: string;
  stats?: AlbumStats;
  limits?: {
    uploadEnabled?: boolean;
    allowImages?: boolean;
    allowVideos?: boolean;
    maxFileSize?: number;
    storageQuota?: number;
    expiresAt?: string | null;
  };
  archivedAt?: string | null;
}

interface AlbumStats {
  fileCount?: number;
  imageCount?: number;
  videoCount?: number;
  totalBytes?: number;
  lastUploadAt?: string | null;
}

/**
 * Roll the album's running totals forward after a file lands.
 *
 * These drive the gallery header, the client's cabinet and the quota check
 * that decides whether the next upload is allowed — so without this the
 * counters read zero forever and the quota never engages.
 *
 * Counting the media rows on each upload would be correct but costs a query
 * per file; a wedding album takes hundreds. Best-effort increments are
 * accurate in practice and cheap.
 */
async function bumpAlbumStats(
  env: Env,
  albumId: string,
  kind: 'IMAGE' | 'VIDEO',
  bytes: number
): Promise<void> {
  try {
    const album = await getDocument<AlbumDoc>(env, `albums/${albumId}`);
    const stats = album?.stats || {};

    await writeDocument(env, `albums/${albumId}`, {
      stats: {
        fileCount: (stats.fileCount || 0) + 1,
        imageCount: (stats.imageCount || 0) + (kind === 'IMAGE' ? 1 : 0),
        videoCount: (stats.videoCount || 0) + (kind === 'VIDEO' ? 1 : 0),
        totalBytes: (stats.totalBytes || 0) + bytes,
        lastUploadAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    // The file is already stored and its metadata written; a stale counter
    // must not turn a successful upload into a failure.
    console.error('could not update album stats', err);
  }
}

interface GuestbookDoc {
  clientId: string;
  eventId: string;
}

/**
 * Decide whether this file may be uploaded to this destination, and return the
 * object key it is allowed to occupy. The browser never chooses its own key —
 * that is what would let one album write into another.
 */
async function authorizeUpload(
  env: Env,
  input: {
    albumId?: string;
    guestbookId?: string;
    filename: string;
    contentType: string;
    fileSize: number;
  }
): Promise<{ objectKey: string; kind: 'IMAGE' | 'VIDEO'; normalizedMime: string; clientId: string; eventId: string }> {
  const media = classifyMedia(input.contentType, input.filename);
  if (!media) {
    throw new HttpError(400, 'this file type is not accepted');
  }

  if (input.albumId) {
    const album = await getDocument<AlbumDoc>(env, `albums/${input.albumId}`);
    if (!album) throw new HttpError(404, 'album not found');

    const limits = album.limits || {};
    if (album.archivedAt) throw new HttpError(403, 'this album is archived');
    if (limits.uploadEnabled === false) throw new HttpError(403, 'uploads are closed for this album');
    if (limits.expiresAt && new Date(limits.expiresAt).getTime() < Date.now()) {
      throw new HttpError(403, 'the upload window for this album has ended');
    }
    if (media.kind === 'IMAGE' && limits.allowImages === false) {
      throw new HttpError(403, 'photos are not accepted in this album');
    }
    if (media.kind === 'VIDEO' && limits.allowVideos === false) {
      throw new HttpError(403, 'videos are not accepted in this album');
    }
    if (limits.maxFileSize && input.fileSize > limits.maxFileSize) {
      throw new HttpError(413, 'this file is larger than the album allows');
    }
    if (
      limits.storageQuota &&
      (album.stats?.totalBytes || 0) + input.fileSize > limits.storageQuota
    ) {
      throw new HttpError(413, 'this album has reached its storage limit');
    }

    return {
      objectKey: albumObjectKey({
        clientId: album.clientId,
        eventId: album.eventId,
        albumId: input.albumId,
        filename: input.filename,
      }),
      kind: media.kind,
      normalizedMime: media.normalizedMime,
      clientId: album.clientId,
      eventId: album.eventId,
    };
  }

  if (input.guestbookId) {
    const book = await getDocument<GuestbookDoc>(env, `guestbooks/${input.guestbookId}`);
    if (!book) throw new HttpError(404, 'guest book not found');

    return {
      objectKey: guestbookObjectKey({
        clientId: book.clientId || 'legacy',
        eventId: book.eventId || 'legacy',
        guestbookId: input.guestbookId,
        filename: input.filename,
      }),
      kind: media.kind,
      normalizedMime: media.normalizedMime,
      clientId: book.clientId || 'legacy',
      eventId: book.eventId || 'legacy',
    };
  }

  throw new HttpError(400, 'an album or a guest book must be named');
}

/**
 * Confirm the album or guest book still exists and is still accepting files.
 * Cheaper than authorizeUpload because it makes no decision about one
 * particular file — it only answers whether this destination is open.
 */
async function assertDestinationAcceptsUploads(
  env: Env,
  destination: { albumId?: string; guestbookId?: string }
): Promise<void> {
  if (destination.albumId) {
    const album = await getDocument<AlbumDoc>(env, `albums/${destination.albumId}`);
    if (!album) throw new HttpError(404, 'album not found');
    if (album.archivedAt) throw new HttpError(403, 'this album is archived');
    if (album.limits?.uploadEnabled === false) {
      throw new HttpError(403, 'uploads are closed for this album');
    }
    if (album.limits?.expiresAt && new Date(album.limits.expiresAt).getTime() < Date.now()) {
      throw new HttpError(403, 'the upload window for this album has ended');
    }
    return;
  }

  if (destination.guestbookId) {
    const book = await getDocument<GuestbookDoc>(env, `guestbooks/${destination.guestbookId}`);
    if (!book) throw new HttpError(404, 'guest book not found');
    return;
  }

  throw new HttpError(400, 'an album or a guest book must be named');
}

/**
 * The key handed back on sign-part and complete has to be one this Worker
 * issued for this destination, or a caller could complete an upload into
 * someone else's prefix.
 */
function assertKeyBelongsTo(objectKey: string, destination: { albumId?: string; guestbookId?: string }): void {
  const expected = destination.albumId
    ? `/albums/${destination.albumId}/originals/`
    : destination.guestbookId
      ? `/guestbooks/${destination.guestbookId}/originals/`
      : null;

  if (!expected || !objectKey.includes(expected) || objectKey.includes('..')) {
    throw new HttpError(403, 'that object key does not belong to this destination');
  }
}

export const uploadRoutes = new Hono<{ Bindings: Env }>();

/** Start an upload: small files get one presigned PUT, large ones get a multipart session. */
uploadRoutes.post('/create', async (c) => {
  const ip = clientAddress(c.req.raw);
  await enforceRateLimit(c.env, `upload:${ip}`, 300, 3600);

  const input = uploadRequestSchema.parse(await c.req.json());
  await verifyTurnstile(c.env, input.turnstileToken, ip);

  const target = await authorizeUpload(c.env, input);

  if (input.fileSize <= MULTIPART_THRESHOLD) {
    return c.json({
      mode: 'single' as const,
      objectKey: target.objectKey,
      uploadUrl: await presignPut(c.env, target.objectKey, target.normalizedMime),
      kind: target.kind,
    });
  }

  const uploadId = await createMultipartUpload(c.env, target.objectKey, target.normalizedMime);
  return c.json({
    mode: 'multipart' as const,
    objectKey: target.objectKey,
    uploadId,
    kind: target.kind,
    partSize: 8 * 1024 * 1024,
  });
});

uploadRoutes.post('/multipart/sign-part', async (c) => {
  const ip = clientAddress(c.req.raw);
  await enforceRateLimit(c.env, `signpart:${ip}`, 5000, 3600);

  const input = signPartSchema.parse(await c.req.json());
  assertKeyBelongsTo(input.objectKey, input);

  // Re-check the destination on every part. Without this the endpoint would
  // hand out a signature for any well-formed key, so naming an album that
  // does not exist — or one whose uploads are closed — would still be signed.
  await assertDestinationAcceptsUploads(c.env, input);

  return c.json({
    url: await presignUploadPart(c.env, input.objectKey, input.uploadId, input.partNumber),
  });
});

/** Finish the upload and only then write the metadata row. */
uploadRoutes.post('/multipart/complete', async (c) => {
  const input = completeSchema.parse(await c.req.json());
  assertKeyBelongsTo(input.objectKey, input);

  const target = await authorizeUpload(c.env, input);
  await completeMultipartUpload(c.env, input.objectKey, input.uploadId, input.parts);

  const mediaId = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  await writeDocument(c.env, `albumMedia/${mediaId}`, {
    albumId: input.albumId || null,
    guestbookId: input.guestbookId || null,
    clientId: target.clientId,
    eventId: target.eventId,
    kind: target.kind,
    storageProvider: 'r2',
    objectKey: input.objectKey,
    originalName: input.filename,
    mimeType: target.normalizedMime,
    fileSize: input.fileSize,
    width: input.width ?? null,
    height: input.height ?? null,
    durationSeconds: input.durationSeconds ?? null,
    uploaderName: input.uploaderName || null,
    status: 'READY',
    uploadedAt: new Date().toISOString(),
  });

  if (input.albumId) {
    await bumpAlbumStats(c.env, input.albumId, target.kind, input.fileSize);
  }

  return c.json({ mediaId, objectKey: input.objectKey });
});

uploadRoutes.post('/multipart/abort', async (c) => {
  await enforceRateLimit(c.env, `abort:${clientAddress(c.req.raw)}`, 500, 3600);

  const input = abortSchema.parse(await c.req.json());
  await abortMultipartUpload(c.env, input.objectKey, input.uploadId);
  return c.json({ ok: true });
});

/** A single-part upload reports itself here so the metadata row is written. */
uploadRoutes.post('/finalize', async (c) => {
  const input = completeSchema.omit({ uploadId: true, parts: true }).parse(await c.req.json());
  assertKeyBelongsTo(input.objectKey, input);

  const target = await authorizeUpload(c.env, input);

  const head = await c.env.MEDIA.head(input.objectKey);
  if (!head) throw new HttpError(409, 'the file did not arrive in storage');

  const mediaId = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  await writeDocument(c.env, `albumMedia/${mediaId}`, {
    albumId: input.albumId || null,
    guestbookId: input.guestbookId || null,
    clientId: target.clientId,
    eventId: target.eventId,
    kind: target.kind,
    storageProvider: 'r2',
    objectKey: input.objectKey,
    originalName: input.filename,
    mimeType: target.normalizedMime,
    // Trust storage over the browser for the byte count.
    fileSize: head.size,
    width: input.width ?? null,
    height: input.height ?? null,
    durationSeconds: input.durationSeconds ?? null,
    uploaderName: input.uploaderName || null,
    status: 'READY',
    uploadedAt: new Date().toISOString(),
  });

  if (input.albumId) {
    await bumpAlbumStats(c.env, input.albumId, target.kind, head.size);
  }

  return c.json({ mediaId, objectKey: input.objectKey, fileSize: head.size });
});

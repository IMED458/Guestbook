import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../env.ts';
import { bearerToken, requirePermission, verifyIdToken, type VerifiedToken } from '../auth.ts';
import { HttpError, deleteDocument, getDocument } from '../google.ts';
import { deleteObject, presignGet, previewKeyFor } from '../r2.ts';

interface MediaDoc {
  objectKey?: string;
  thumbnailKey?: string;
  originalName: string;
  clientId?: string;
  albumId?: string;
  storageProvider?: string;
  url?: string;
}

/** A client may reach their own media; staff need the matching permission. */
function assertMayRead(token: VerifiedToken, media: MediaDoc): void {
  if (token.role === 'SUPER_ADMIN') return;
  if (token.role === 'STAFF') {
    requirePermission(token, 'albums.view');
    return;
  }
  if (token.role === 'CLIENT' && token.clientId && token.clientId === media.clientId) return;
  throw new HttpError(403, 'you do not have access to this file');
}

export const mediaRoutes = new Hono<{ Bindings: Env }>();

/** Hand back a short-lived link to the untouched original. */
mediaRoutes.get('/:id/download', async (c) => {
  const token = await verifyIdToken(c.env, bearerToken(c.req.raw));
  const media = await getDocument<MediaDoc>(c.env, `albumMedia/${c.req.param('id')}`);
  if (!media) throw new HttpError(404, 'file not found');

  assertMayRead(token, media);

  // Legacy Cloudinary rows keep working — they are already public URLs.
  if (media.storageProvider !== 'r2' && media.url) {
    return c.json({ url: media.url, legacy: true });
  }
  if (!media.objectKey) throw new HttpError(409, 'this record has no stored file');

  return c.json({
    url: await presignGet(c.env, media.objectKey, media.originalName),
    legacy: false,
  });
});

mediaRoutes.delete('/:id', async (c) => {
  const token = await verifyIdToken(c.env, bearerToken(c.req.raw));
  requirePermission(token, 'media.delete');

  const id = c.req.param('id');
  const media = await getDocument<MediaDoc>(c.env, `albumMedia/${id}`);
  if (!media) throw new HttpError(404, 'file not found');

  // Storage first, metadata second: an orphaned row is recoverable, an
  // orphaned object is invisible and bills forever.
  const failures: string[] = [];
  if (media.objectKey) {
    try {
      await deleteObject(c.env, media.objectKey);
      await deleteObject(c.env, media.thumbnailKey || previewKeyFor(media.objectKey));
    } catch (err) {
      failures.push(String(err));
    }
  }

  await deleteDocument(c.env, `albumMedia/${id}`);

  return c.json({ ok: true, storageWarnings: failures });
});

/** Presigned links for a selection, so a bulk download does not go through us. */
mediaRoutes.post('/download-batch', async (c) => {
  const token = await verifyIdToken(c.env, bearerToken(c.req.raw));
  const input = z.object({ ids: z.array(z.string().max(128)).min(1).max(200) }).parse(await c.req.json());

  const results: { id: string; url?: string; name?: string; error?: string }[] = [];

  for (const id of input.ids) {
    const media = await getDocument<MediaDoc>(c.env, `albumMedia/${id}`);
    if (!media) {
      results.push({ id, error: 'not found' });
      continue;
    }
    try {
      assertMayRead(token, media);
      const url =
        media.storageProvider !== 'r2' && media.url
          ? media.url
          : await presignGet(c.env, media.objectKey!, media.originalName);
      results.push({ id, url, name: media.originalName });
    } catch (err) {
      results.push({ id, error: err instanceof HttpError ? err.message : 'unavailable' });
    }
  }

  return c.json({ results });
});

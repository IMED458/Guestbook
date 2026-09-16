import { AwsClient } from 'aws4fetch';
import type { Env } from './env.ts';
import { HttpError } from './google.ts';

/**
 * R2 through its S3-compatible API.
 *
 * Browsers upload straight to R2 with a presigned URL, so a 2 GB video never
 * passes through the Worker. The Worker's job is to decide whether an upload
 * is allowed and to hand out a narrowly scoped, short-lived signature for one
 * specific object key.
 */

const SIGNED_URL_TTL_SECONDS = 3600;

function client(env: Env): AwsClient {
  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });
}

function endpoint(env: Env): string {
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}`;
}

/** Percent-encode each path segment but keep the slashes between them. */
function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export async function presignPut(
  env: Env,
  key: string,
  contentType: string,
  ttl = SIGNED_URL_TTL_SECONDS
): Promise<string> {
  const url = new URL(`${endpoint(env)}/${encodeKey(key)}`);
  url.searchParams.set('X-Amz-Expires', String(ttl));

  const signed = await client(env).sign(
    new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }),
    { aws: { signQuery: true } }
  );
  return signed.url;
}

export async function presignGet(env: Env, key: string, downloadName?: string, ttl = SIGNED_URL_TTL_SECONDS): Promise<string> {
  const url = new URL(`${endpoint(env)}/${encodeKey(key)}`);
  url.searchParams.set('X-Amz-Expires', String(ttl));
  if (downloadName) {
    // Hand the browser the guest's original filename back on download.
    url.searchParams.set(
      'response-content-disposition',
      `attachment; filename="${downloadName.replace(/"/g, '')}"`
    );
  }

  const signed = await client(env).sign(new Request(url, { method: 'GET' }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

/* ------------------------------------------------------------------ */
/* Multipart — what makes a large mobile upload survivable             */
/* ------------------------------------------------------------------ */

function xmlValue(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(xml);
  return match ? match[1] : null;
}

export async function createMultipartUpload(
  env: Env,
  key: string,
  contentType: string
): Promise<string> {
  const url = `${endpoint(env)}/${encodeKey(key)}?uploads=`;
  const res = await client(env).fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
  });

  if (!res.ok) {
    throw new HttpError(502, `could not start the upload: ${res.status} ${await res.text()}`);
  }

  const uploadId = xmlValue(await res.text(), 'UploadId');
  if (!uploadId) throw new HttpError(502, 'R2 did not return an upload id');
  return uploadId;
}

export async function presignUploadPart(
  env: Env,
  key: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const url = new URL(`${endpoint(env)}/${encodeKey(key)}`);
  url.searchParams.set('partNumber', String(partNumber));
  url.searchParams.set('uploadId', uploadId);
  url.searchParams.set('X-Amz-Expires', String(SIGNED_URL_TTL_SECONDS));

  const signed = await client(env).sign(new Request(url, { method: 'PUT' }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function completeMultipartUpload(
  env: Env,
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[]
): Promise<void> {
  const body = [
    '<CompleteMultipartUpload>',
    ...parts
      .slice()
      .sort((a, b) => a.partNumber - b.partNumber)
      .map(
        (p) =>
          `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag.replace(/"/g, '&quot;')}</ETag></Part>`
      ),
    '</CompleteMultipartUpload>',
  ].join('');

  const url = `${endpoint(env)}/${encodeKey(key)}?uploadId=${encodeURIComponent(uploadId)}`;
  const res = await client(env).fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body,
  });

  if (!res.ok) {
    throw new HttpError(502, `could not finish the upload: ${res.status} ${await res.text()}`);
  }
}

export async function abortMultipartUpload(
  env: Env,
  key: string,
  uploadId: string
): Promise<void> {
  const url = `${endpoint(env)}/${encodeKey(key)}?uploadId=${encodeURIComponent(uploadId)}`;
  await client(env).fetch(url, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/* Object keys                                                         */
/* ------------------------------------------------------------------ */

/**
 * Strip anything that could escape the prefix or confuse a download header.
 * A guest's filename is never trusted as an identifier — a uuid always
 * precedes it — but it is kept readable so a download is recognisable.
 */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() || 'file';
  return base
    .replace(/[^\w.\-Ⴀ-ჿ]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 120);
}

export function albumObjectKey(params: {
  clientId: string;
  eventId: string;
  albumId: string;
  filename: string;
}): string {
  return `clients/${params.clientId}/events/${params.eventId}/albums/${params.albumId}/originals/${crypto.randomUUID()}-${sanitizeFilename(params.filename)}`;
}

export function guestbookObjectKey(params: {
  clientId: string;
  eventId: string;
  guestbookId: string;
  filename: string;
}): string {
  return `clients/${params.clientId}/events/${params.eventId}/guestbooks/${params.guestbookId}/originals/${crypto.randomUUID()}-${sanitizeFilename(params.filename)}`;
}

/** The preview lives beside the original and never replaces it. */
export function previewKeyFor(objectKey: string): string {
  return objectKey.replace('/originals/', '/previews/').replace(/\.[^.]+$/, '.jpg');
}

export async function deleteObject(env: Env, key: string): Promise<void> {
  await env.MEDIA.delete(key);
}

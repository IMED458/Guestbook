import type { Env } from './env.ts';

/**
 * Talking to Google as the service account, without the Firebase Admin SDK
 * (which needs Node APIs a Worker does not have). We mint a signed JWT with
 * WebCrypto, exchange it for an OAuth access token, and cache that until it
 * is nearly expired.
 */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAccount: ServiceAccount | null = null;

function serviceAccount(env: Env): ServiceAccount {
  if (cachedAccount) return cachedAccount;
  try {
    const parsed = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('missing client_email or private_key');
    }
    cachedAccount = parsed;
    return parsed;
  } catch (err) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT is not valid service-account JSON: ${err}`);
  }
}

function base64Url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

/** An OAuth access token scoped to Firestore and Identity Toolkit. */
export async function getAccessToken(env: Env): Promise<string> {
  // Refresh a minute early so a request never races the expiry.
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const account = serviceAccount(env);
  const now = Math.floor(Date.now() / 1000);

  const claim = {
    iss: account.client_email,
    scope: [
      'https://www.googleapis.com/auth/datastore',
      'https://www.googleapis.com/auth/firebase',
      'https://www.googleapis.com/auth/identitytoolkit',
    ].join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64Url(
    JSON.stringify(claim)
  )}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(account.private_key.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );

  const assertion = `${unsigned}.${base64Url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
  return body.access_token;
}

/* ------------------------------------------------------------------ */
/* Identity Toolkit — the privileged user operations                   */
/* ------------------------------------------------------------------ */

const IDENTITY_BASE = 'https://identitytoolkit.googleapis.com/v1';

async function identityRequest<T>(
  env: Env,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const token = await getAccessToken(env);
  const res = await fetch(`${IDENTITY_BASE}/projects/${env.FIREBASE_PROJECT_ID}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      message = (JSON.parse(text) as { error?: { message?: string } }).error?.message || text;
    } catch {
      // Keep the raw body.
    }
    throw new HttpError(res.status === 400 ? 400 : 502, `identity: ${message}`);
  }

  return text ? (JSON.parse(text) as T) : ({} as T);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export interface CreatedAuthUser {
  localId: string;
}

export async function createAuthUser(
  env: Env,
  params: { email: string; password: string; displayName?: string }
): Promise<CreatedAuthUser> {
  return identityRequest<CreatedAuthUser>(env, '/accounts', {
    email: params.email,
    password: params.password,
    displayName: params.displayName,
    emailVerified: false,
  });
}

export async function updateAuthUser(
  env: Env,
  params: {
    localId: string;
    password?: string;
    email?: string;
    displayName?: string;
    disableUser?: boolean;
    customAttributes?: Record<string, unknown>;
  }
): Promise<void> {
  const body: Record<string, unknown> = { localId: params.localId };
  if (params.password) body.password = params.password;
  if (params.email) body.email = params.email;
  if (params.displayName !== undefined) body.displayName = params.displayName;
  if (params.disableUser !== undefined) body.disableUser = params.disableUser;
  if (params.customAttributes) {
    body.customAttributes = JSON.stringify(params.customAttributes);
  }
  await identityRequest(env, '/accounts:update', body);
}

export async function deleteAuthUser(env: Env, localId: string): Promise<void> {
  await identityRequest(env, '/accounts:delete', { localId });
}

/* ------------------------------------------------------------------ */
/* Firestore REST — the Worker's own view of the database              */
/* ------------------------------------------------------------------ */

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1';

function documentPath(env: Env, path: string): string {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
}

/** Firestore's typed value wrapper → a plain JS value. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromFirestoreValue(value: any): unknown {
  if (value === null || value === undefined) return null;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in value) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFirestoreValue(value: unknown): any {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

export async function getDocument<T>(env: Env, path: string): Promise<T | null> {
  const token = await getAccessToken(env);
  const res = await fetch(`${FIRESTORE_BASE}/${documentPath(env, path)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new HttpError(502, `firestore get failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as { fields?: Record<string, unknown> };
  return fromFirestoreValue({ mapValue: { fields: body.fields || {} } }) as T;
}

export async function writeDocument(
  env: Env,
  path: string,
  data: Record<string, unknown>,
  merge = true
): Promise<void> {
  const token = await getAccessToken(env);
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);

  const query = merge
    ? `?${Object.keys(data)
        .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
        .join('&')}`
    : '';

  const res = await fetch(`${FIRESTORE_BASE}/${documentPath(env, path)}${query}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    throw new HttpError(502, `firestore write failed: ${res.status} ${await res.text()}`);
  }
}

export async function deleteDocument(env: Env, path: string): Promise<void> {
  const token = await getAccessToken(env);
  const res = await fetch(`${FIRESTORE_BASE}/${documentPath(env, path)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new HttpError(502, `firestore delete failed: ${res.status}`);
  }
}

/** Equality-only query against one collection. */
export async function queryCollection<T>(
  env: Env,
  collection: string,
  where: { field: string; value: unknown }[],
  limit = 50
): Promise<{ id: string; data: T }[]> {
  const token = await getAccessToken(env);

  const filters = where.map((w) => ({
    fieldFilter: {
      field: { fieldPath: w.field },
      op: 'EQUAL',
      value: toFirestoreValue(w.value),
    },
  }));

  const res = await fetch(
    `${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where:
            filters.length === 1
              ? filters[0]
              : { compositeFilter: { op: 'AND', filters } },
          limit,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new HttpError(502, `firestore query failed: ${res.status} ${await res.text()}`);
  }

  const rows = (await res.json()) as { document?: { name: string; fields?: Record<string, unknown> } }[];
  return rows
    .filter((r) => r.document)
    .map((r) => ({
      id: r.document!.name.split('/').pop() as string,
      data: fromFirestoreValue({ mapValue: { fields: r.document!.fields || {} } }) as T,
    }));
}

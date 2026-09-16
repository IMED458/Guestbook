import type { Env } from './env.ts';
import { HttpError } from './google.ts';

/**
 * Verifying a Firebase ID token.
 *
 * The token is RS256-signed by Google. We fetch Google's public certificates,
 * check the signature and every standard claim, and only then believe anything
 * inside it. The role and clientId travel as custom claims, set by this Worker
 * when a user is created or edited — so a browser cannot hand us a role.
 */

const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let certCache: { keys: Record<string, string>; expiresAt: number } | null = null;

async function googleCertificates(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) return certCache.keys;

  const res = await fetch(CERT_URL);
  if (!res.ok) throw new HttpError(502, 'could not fetch Google signing certificates');

  const keys = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAge = Number(/max-age=(\d+)/.exec(cacheControl)?.[1] || 3600);

  certCache = { keys, expiresAt: Date.now() + maxAge * 1000 };
  return keys;
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pemCertToSpki(pem: string): ArrayBuffer {
  // A PEM certificate wraps a DER X.509 cert; WebCrypto wants the SPKI inside
  // it. Rather than parse ASN.1 by hand we import the whole cert body, which
  // Workers' WebCrypto accepts for RSASSA-PKCS1-v1_5 verification.
  const body = pem
    .replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // Walk the DER far enough to find the SubjectPublicKeyInfo sequence.
  return extractSpki(bytes);
}

/** Minimal DER walk: find the AlgorithmIdentifier for RSA and take its SEQUENCE. */
function extractSpki(der: Uint8Array): ArrayBuffer {
  // OID 1.2.840.113549.1.1.1 (rsaEncryption) as DER bytes.
  const marker = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01];

  for (let i = 0; i < der.length - marker.length; i++) {
    let match = true;
    for (let j = 0; j < marker.length; j++) {
      if (der[i + j] !== marker[j]) {
        match = false;
        break;
      }
    }
    if (!match) continue;

    // The SPKI SEQUENCE starts just before this AlgorithmIdentifier. Walk back
    // over the 0x30 tag and its length bytes.
    for (let start = i - 4; start >= 0; start--) {
      if (der[start] !== 0x30) continue;
      const lengthByte = der[start + 1];
      let headerLength = 2;
      let length = lengthByte;
      if (lengthByte & 0x80) {
        const count = lengthByte & 0x7f;
        headerLength = 2 + count;
        length = 0;
        for (let k = 0; k < count; k++) length = (length << 8) | der[start + 2 + k];
      }
      const end = start + headerLength + length;
      if (start + headerLength === i && end <= der.length) {
        return der.slice(start, end).buffer;
      }
    }
  }

  throw new HttpError(502, 'could not read the public key out of the Google certificate');
}

export interface VerifiedToken {
  uid: string;
  role?: string;
  clientId?: string;
  perms?: number[];
  email?: string;
}

export async function verifyIdToken(env: Env, idToken: string): Promise<VerifiedToken> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'malformed token');

  const [headerPart, payloadPart, signaturePart] = parts;

  let header: { alg?: string; kid?: string };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerPart)));
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
  } catch {
    throw new HttpError(401, 'unreadable token');
  }

  if (header.alg !== 'RS256') throw new HttpError(401, 'unexpected token algorithm');
  if (!header.kid) throw new HttpError(401, 'token has no key id');

  const certs = await googleCertificates();
  const cert = certs[header.kid];
  if (!cert) throw new HttpError(401, 'token signed by an unknown key');

  const key = await crypto.subtle.importKey(
    'spki',
    pemCertToSpki(cert),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlDecode(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`)
  );
  if (!valid) throw new HttpError(401, 'bad token signature');

  const now = Math.floor(Date.now() / 1000);
  const projectId = env.FIREBASE_PROJECT_ID;

  if (payload.aud !== projectId) throw new HttpError(401, 'token issued for another project');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new HttpError(401, 'unexpected token issuer');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= now) {
    throw new HttpError(401, 'token expired');
  }
  if (typeof payload.iat !== 'number' || payload.iat > now + 60) {
    throw new HttpError(401, 'token issued in the future');
  }
  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new HttpError(401, 'token has no subject');
  }

  return {
    uid: payload.sub,
    role: typeof payload.role === 'string' ? payload.role : undefined,
    clientId: typeof payload.clientId === 'string' ? payload.clientId : undefined,
    perms: Array.isArray(payload.perms) ? (payload.perms as number[]) : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
}

export function bearerToken(request: Request): string {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'authentication required');
  const token = header.slice(7).trim();
  if (!token) throw new HttpError(401, 'authentication required');
  return token;
}

/**
 * The index of each permission in the shared PERMISSIONS list. Custom claims
 * are capped at 1000 bytes, so indices are stored rather than the full
 * strings. The order here is a contract with src/domain/roles.ts and with
 * firestore.rules — append only, never reorder.
 */
export const PERMISSION_INDEX: Record<string, number> = {
  'orders.view': 0,
  'orders.create': 1,
  'orders.edit': 2,
  'orders.delete': 3,
  'clients.view': 4,
  'clients.create': 5,
  'clients.edit': 6,
  'clients.delete': 7,
  'events.view': 8,
  'events.manage': 9,
  'guestbooks.view': 10,
  'guestbooks.manage': 11,
  'albums.view': 12,
  'albums.manage': 13,
  'media.delete': 14,
  'payments.view': 15,
  'payments.edit': 16,
  'catalog.view': 17,
  'catalog.manage': 18,
  'users.view': 19,
  'users.manage': 20,
  'emails.send': 21,
  'requests.view': 22,
  'requests.manage': 23,
  'activity.view': 24,
  'settings.manage': 25,
};

export function tokenHasPermission(token: VerifiedToken, permission: string): boolean {
  if (token.role === 'SUPER_ADMIN') return true;
  if (token.role !== 'STAFF') return false;

  const index = PERMISSION_INDEX[permission];
  if (index === undefined) return false;
  return (token.perms || []).includes(index);
}

export function requirePermission(token: VerifiedToken, permission: string): void {
  if (!tokenHasPermission(token, permission)) {
    throw new HttpError(403, `missing permission: ${permission}`);
  }
}

export function requireSuperAdmin(token: VerifiedToken): void {
  if (token.role !== 'SUPER_ADMIN') {
    throw new HttpError(403, 'this operation is restricted to a super administrator');
  }
}

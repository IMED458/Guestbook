import { auth } from '../lib/firebase.ts';

/**
 * The browser's half of the conversation with the Worker.
 *
 * Every privileged call carries a Firebase ID token, which the Worker verifies
 * against Google's signing keys. Nothing here decides what the caller is
 * allowed to do — that judgement happens on the other side.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const apiConfigured = Boolean(API_BASE_URL);

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string[]
  ) {
    super(message);
  }
}

async function idToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'ავტორიზაცია საჭიროა');
  return user.getIdToken();
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Public endpoints (guest uploads) carry no token. */
  authenticated?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!apiConfigured) {
    throw new ApiError(
      503,
      'სერვერული API კონფიგურირებული არ არის — შეავსეთ VITE_API_BASE_URL'
    );
  }

  const { method = 'GET', body, authenticated = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (authenticated) {
    headers.Authorization = `Bearer ${await idToken()}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'სერვერთან კავშირი ვერ დამყარდა');
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const payload = (parsed || {}) as { error?: string; details?: string[] };
    throw new ApiError(res.status, payload.error || `მოთხოვნა ვერ შესრულდა (${res.status})`, payload.details);
  }

  return parsed as T;
}

/** Upload a single part or a whole small file straight to R2. */
export async function putToStorage(
  url: string,
  body: Blob,
  contentType: string | undefined,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<{ etag: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(e.loaded, e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // R2 returns the part's ETag, which multipart completion needs.
        resolve({ etag: (xhr.getResponseHeader('ETag') || '').replace(/"/g, '') });
      } else {
        reject(new ApiError(xhr.status, `ფაილის ატვირთვა ვერ მოხერხდა (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new ApiError(0, 'ქსელის შეცდომა ატვირთვისას'));
    xhr.onabort = () => reject(new ApiError(0, 'ატვირთვა გაუქმდა'));

    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(body);
  });
}

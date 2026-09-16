import type { Env } from './env.ts';
import { HttpError } from './google.ts';

/**
 * A fixed-window counter in KV. Coarse, eventually consistent, and entirely
 * adequate for keeping one address from opening ten thousand uploads — which
 * is the actual threat on a public wedding album.
 */
export async function enforceRateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const counterKey = `rl:${key}:${window}`;

  const current = Number((await env.RATE_LIMIT.get(counterKey)) || 0);
  if (current >= limit) {
    throw new HttpError(429, 'too many requests — please wait a moment and try again');
  }

  await env.RATE_LIMIT.put(counterKey, String(current + 1), {
    expirationTtl: windowSeconds * 2,
  });
}

export function clientAddress(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    'unknown'
  );
}

/** Cloudflare Turnstile, when a secret is configured. Skipped when it is not. */
export async function verifyTurnstile(
  env: Env,
  token: string | undefined,
  ip: string
): Promise<void> {
  if (!env.TURNSTILE_SECRET_KEY) return;
  if (!token) throw new HttpError(400, 'human verification is required');

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
  });

  const body = (await res.json()) as { success: boolean };
  if (!body.success) throw new HttpError(400, 'human verification failed');
}

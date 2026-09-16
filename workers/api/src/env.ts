export interface Env {
  // vars
  FIREBASE_PROJECT_ID: string;
  R2_BUCKET_NAME: string;
  AUTH_EMAIL_DOMAIN: string;
  ALLOWED_ORIGINS: string;
  /** Not a secret: it is part of every dashboard and S3 endpoint URL. */
  R2_ACCOUNT_ID: string;

  // secrets
  FIREBASE_SERVICE_ACCOUNT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  TURNSTILE_SECRET_KEY?: string;

  // bindings
  MEDIA: R2Bucket;
  RATE_LIMIT: KVNamespace;
}

export function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import { allowedOrigins, type Env } from './env.ts';
import { HttpError } from './google.ts';
import { mediaRoutes } from './routes/media.ts';
import { uploadRoutes } from './routes/uploads.ts';
import { userRoutes } from './routes/users.ts';

/**
 * The privileged half of the system.
 *
 * Everything here exists because it cannot be done safely in a browser:
 * minting Firebase users, signing R2 uploads, and deleting stored objects.
 * The service account and the R2 secret live only in Worker secrets.
 */
const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const handler = cors({
    origin: (origin) => (allowedOrigins(c.env).includes(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  });
  return handler(c, next);
});

app.get('/api/health', (c) =>
  c.json({ status: 'ok', service: 'guestbook-api', time: new Date().toISOString() })
);

app.route('/api/admin/users', userRoutes);
app.route('/api/uploads', uploadRoutes);
app.route('/api/media', mediaRoutes);

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: err.message }, err.status as 400);
  }
  if (err instanceof ZodError) {
    return c.json(
      { error: 'invalid request', details: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`) },
      400
    );
  }

  // Never leak an internal message; the detail goes to the tail log instead.
  console.error('unhandled worker error', err);
  return c.json({ error: 'internal error' }, 500);
});

app.notFound((c) => c.json({ error: 'not found' }, 404));

export default app;

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../env.ts';
import {
  PERMISSION_INDEX,
  bearerToken,
  requirePermission,
  requireSuperAdmin,
  verifyIdToken,
  type VerifiedToken,
} from '../auth.ts';
import {
  HttpError,
  createAuthUser,
  deleteAuthUser,
  getDocument,
  updateAuthUser,
  writeDocument,
  deleteDocument,
} from '../google.ts';

/**
 * Creating a user cannot happen in the browser: the Firebase client SDK signs
 * you in as whoever you just created, which would throw the administrator out
 * of their own session. These endpoints hold the service account instead.
 */

const usernamePattern = /^[a-z][a-z0-9._-]{2,31}$/;

const accessSchema = z.object({
  guestbook: z.boolean(),
  album: z.boolean(),
  orders: z.boolean(),
  payments: z.boolean(),
});

const createUserSchema = z.object({
  username: z.string().transform((v) => v.trim().toLowerCase().replace(/\s+/g, '')),
  password: z.string().min(6).max(128),
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).default(''),
  companyName: z.string().max(160).optional(),
  contactEmail: z.string().email().max(200).optional().or(z.literal('')),
  phone: z.string().max(40).optional(),
  role: z.enum(['SUPER_ADMIN', 'STAFF', 'CLIENT']),
  permissions: z.array(z.string()).max(64).default([]),
  clientId: z.string().max(128).optional(),
  access: accessSchema.default({ guestbook: false, album: false, orders: false, payments: false }),
  mustChangePassword: z.boolean().default(true),
});

const updateUserSchema = createUserSchema
  .omit({ password: true, username: true })
  .partial()
  .extend({ username: z.string().optional() });

const passwordSchema = z.object({
  password: z.string().min(6).max(128),
  mustChangePassword: z.boolean().default(true),
});

function permissionIndices(permissions: string[]): number[] {
  return permissions
    .map((p) => PERMISSION_INDEX[p])
    .filter((i): i is number => i !== undefined);
}

/** Claims are what firestore.rules and this Worker both trust. Keep them small. */
async function applyClaims(
  env: Env,
  uid: string,
  role: string,
  clientId: string | undefined,
  permissions: string[]
): Promise<void> {
  await updateAuthUser(env, {
    localId: uid,
    customAttributes: {
      role,
      ...(clientId ? { clientId } : {}),
      ...(role === 'STAFF' ? { perms: permissionIndices(permissions) } : {}),
    },
  });
}

async function authenticate(c: { env: Env; req: { raw: Request } }): Promise<VerifiedToken> {
  return verifyIdToken(c.env, bearerToken(c.req.raw));
}

/**
 * Only a super administrator may mint another administrator. A staff member
 * with users.manage can create clients, and nothing above their own level.
 */
function assertMayAssignRole(actor: VerifiedToken, role: string): void {
  if (role === 'SUPER_ADMIN' || role === 'STAFF') {
    requireSuperAdmin(actor);
  } else {
    requirePermission(actor, 'users.manage');
  }
}

export const userRoutes = new Hono<{ Bindings: Env }>();

userRoutes.post('/', async (c) => {
  const actor = await authenticate(c);
  const input = createUserSchema.parse(await c.req.json());

  assertMayAssignRole(actor, input.role);

  if (!usernamePattern.test(input.username)) {
    throw new HttpError(400, 'username must start with a letter and use only a-z, 0-9, dot, dash or underscore');
  }

  // The claim document is the uniqueness guarantee; a query could race.
  const existing = await getDocument<{ uid: string }>(c.env, `usernames/${input.username}`);
  if (existing) throw new HttpError(409, 'that username is already taken');

  const authEmail = `${input.username}@${c.env.AUTH_EMAIL_DOMAIN}`;
  const created = await createAuthUser(c.env, {
    email: authEmail,
    password: input.password,
    displayName: `${input.firstName} ${input.lastName}`.trim(),
  });

  const now = new Date().toISOString();
  await writeDocument(c.env, `users/${created.localId}`, {
    username: input.username,
    authEmail,
    firstName: input.firstName,
    lastName: input.lastName,
    companyName: input.companyName || null,
    contactEmail: input.contactEmail || null,
    phone: input.phone || null,
    role: input.role,
    permissions: input.role === 'STAFF' ? input.permissions : [],
    clientId: input.clientId || null,
    access: input.access,
    status: 'ACTIVE',
    mustChangePassword: input.mustChangePassword,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.uid,
  }, false);

  await writeDocument(c.env, `usernames/${input.username}`, { uid: created.localId, createdAt: now }, false);
  await applyClaims(c.env, created.localId, input.role, input.clientId, input.permissions);

  await writeDocument(c.env, `activityLogs/${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`, {
    actorUserId: actor.uid,
    actorName: actor.email || actor.uid,
    action: 'user.created',
    entityType: 'user',
    entityId: created.localId,
    timestamp: now,
    metadata: { username: input.username, role: input.role },
  }, false);

  return c.json({ uid: created.localId, username: input.username, authEmail });
});

userRoutes.patch('/:uid', async (c) => {
  const actor = await authenticate(c);
  const uid = c.req.param('uid');
  const input = updateUserSchema.parse(await c.req.json());

  const current = await getDocument<{ username: string; role: string; clientId?: string; permissions?: string[] }>(
    c.env,
    `users/${uid}`
  );
  if (!current) throw new HttpError(404, 'user not found');

  assertMayAssignRole(actor, input.role || current.role);

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of ['firstName', 'lastName', 'companyName', 'contactEmail', 'phone', 'access', 'clientId', 'mustChangePassword'] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  if (input.role) patch.role = input.role;
  if (input.permissions) patch.permissions = input.permissions;

  // A username change moves the claim document as well as the profile.
  if (input.username) {
    const username = input.username.trim().toLowerCase().replace(/\s+/g, '');
    if (username !== current.username) {
      if (!usernamePattern.test(username)) throw new HttpError(400, 'invalid username');
      const taken = await getDocument(c.env, `usernames/${username}`);
      if (taken) throw new HttpError(409, 'that username is already taken');

      const authEmail = `${username}@${c.env.AUTH_EMAIL_DOMAIN}`;
      await updateAuthUser(c.env, { localId: uid, email: authEmail });
      await writeDocument(c.env, `usernames/${username}`, { uid, createdAt: new Date().toISOString() }, false);
      await deleteDocument(c.env, `usernames/${current.username}`);
      patch.username = username;
      patch.authEmail = authEmail;
    }
  }

  await writeDocument(c.env, `users/${uid}`, patch);
  await applyClaims(
    c.env,
    uid,
    (input.role || current.role) as string,
    (input.clientId ?? current.clientId) || undefined,
    input.permissions || current.permissions || []
  );

  return c.json({ ok: true });
});

userRoutes.post('/:uid/reset-password', async (c) => {
  const actor = await authenticate(c);
  requirePermission(actor, 'users.manage');

  const uid = c.req.param('uid');
  const input = passwordSchema.parse(await c.req.json());

  await updateAuthUser(c.env, { localId: uid, password: input.password });
  await writeDocument(c.env, `users/${uid}`, {
    mustChangePassword: input.mustChangePassword,
    updatedAt: new Date().toISOString(),
  });

  await writeDocument(c.env, `activityLogs/${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`, {
    actorUserId: actor.uid,
    actorName: actor.email || actor.uid,
    action: 'user.password_reset',
    entityType: 'user',
    entityId: uid,
    timestamp: new Date().toISOString(),
  }, false);

  // The new password is never echoed back or stored anywhere.
  return c.json({ ok: true });
});

userRoutes.post('/:uid/disable', async (c) => {
  const actor = await authenticate(c);
  requireSuperAdmin(actor);
  const uid = c.req.param('uid');

  await updateAuthUser(c.env, { localId: uid, disableUser: true });
  await writeDocument(c.env, `users/${uid}`, { status: 'DISABLED', updatedAt: new Date().toISOString() });
  return c.json({ ok: true });
});

userRoutes.post('/:uid/enable', async (c) => {
  const actor = await authenticate(c);
  requireSuperAdmin(actor);
  const uid = c.req.param('uid');

  await updateAuthUser(c.env, { localId: uid, disableUser: false });
  await writeDocument(c.env, `users/${uid}`, { status: 'ACTIVE', updatedAt: new Date().toISOString() });
  return c.json({ ok: true });
});

userRoutes.delete('/:uid', async (c) => {
  const actor = await authenticate(c);
  requireSuperAdmin(actor);

  const uid = c.req.param('uid');
  if (uid === actor.uid) throw new HttpError(400, 'you cannot delete your own account');

  const current = await getDocument<{ username: string }>(c.env, `users/${uid}`);

  await deleteAuthUser(c.env, uid);
  await deleteDocument(c.env, `users/${uid}`);
  if (current?.username) await deleteDocument(c.env, `usernames/${current.username}`);

  await writeDocument(c.env, `activityLogs/${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`, {
    actorUserId: actor.uid,
    actorName: actor.email || actor.uid,
    action: 'user.deleted',
    entityType: 'user',
    entityId: uid,
    timestamp: new Date().toISOString(),
    metadata: { username: current?.username || null },
  }, false);

  return c.json({ ok: true });
});

/** A signed-in person changing their own password; no elevated permission needed. */
userRoutes.post('/me/change-password', async (c) => {
  const actor = await authenticate(c);
  const input = z.object({ password: z.string().min(6).max(128) }).parse(await c.req.json());

  await updateAuthUser(c.env, { localId: actor.uid, password: input.password });
  await writeDocument(c.env, `users/${actor.uid}`, {
    mustChangePassword: false,
    updatedAt: new Date().toISOString(),
  });

  return c.json({ ok: true });
});

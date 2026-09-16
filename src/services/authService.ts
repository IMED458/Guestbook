import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.ts';
import { apiRequest } from './apiClient.ts';
import type { AppUser } from '../domain/models.ts';
import { NO_CLIENT_ACCESS } from '../domain/roles.ts';
import { normalizeUsername, usernameToAuthEmail } from '../domain/username.ts';

/**
 * Signing in with a username.
 *
 * Firebase Auth only speaks email, so the username is resolved to the internal
 * address it was created with. The `usernames` collection is publicly readable
 * precisely so this lookup can happen before anyone is authenticated; it holds
 * nothing but a uid.
 */

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
  }
}

function friendlyAuthError(err: unknown): AuthError {
  const code = String((err as { code?: string })?.code || '');

  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return new AuthError('მომხმარებელი ან პაროლი არასწორია', 'invalid-credential');
  }
  if (code.includes('user-disabled')) {
    return new AuthError('ეს ანგარიში გათიშულია — დაუკავშირდით ადმინისტრატორს', 'user-disabled');
  }
  if (code.includes('too-many-requests')) {
    return new AuthError('ძალიან ბევრი მცდელობა — სცადეთ ცოტა ხანში', 'too-many-requests');
  }
  if (code.includes('network-request-failed')) {
    return new AuthError('ქსელთან კავშირი ვერ დამყარდა', 'network');
  }
  if (code.includes('operation-not-allowed')) {
    return new AuthError('Email/Password შესვლა გამორთულია Firebase-ის კონსოლში', 'not-allowed');
  }
  return new AuthError('შესვლა ვერ მოხერხდა', 'unknown');
}

/** Resolve the restored session exactly once, so callers never race the SDK. */
let authReady: Promise<FirebaseUser | null> | null = null;

export function waitForAuth(): Promise<FirebaseUser | null> {
  if (!authReady) {
    authReady = new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        resolve(user);
      });
    });
  }
  return authReady;
}

async function resolveAuthEmail(username: string): Promise<string> {
  const normalized = normalizeUsername(username);

  try {
    const claim = await getDoc(doc(db, 'usernames', normalized));
    if (claim.exists()) {
      const uid = claim.data().uid as string | undefined;
      if (uid) {
        // The profile knows the address the account was actually created with,
        // which matters if the auth domain was ever changed.
        const profile = await getDoc(doc(db, 'users', uid));
        const stored = profile.exists() ? (profile.data().authEmail as string | undefined) : undefined;
        if (stored) return stored;
      }
    }
  } catch {
    // Fall through to the derived address rather than blocking sign-in.
  }

  return usernameToAuthEmail(normalized);
}

export async function signInWithUsername(username: string, password: string): Promise<AppUser> {
  const authEmail = await resolveAuthEmail(username);

  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, authEmail, password);
  } catch (err) {
    throw friendlyAuthError(err);
  }

  const profile = await loadProfile(credential.user.uid);
  if (!profile) {
    await signOut(auth);
    throw new AuthError('ამ ანგარიშს პროფილი არ აქვს — დაუკავშირდით ადმინისტრატორს', 'no-profile');
  }
  if (profile.status === 'DISABLED') {
    await signOut(auth);
    throw new AuthError('ეს ანგარიში გათიშულია', 'user-disabled');
  }

  // Best-effort; a failed stamp must not block signing in.
  void updateDoc(doc(db, 'users', profile.id), { lastLoginAt: new Date().toISOString() }).catch(() => {});

  return profile;
}

export async function loadProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    id: uid,
    username: data.username || '',
    authEmail: data.authEmail || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    companyName: data.companyName || undefined,
    contactEmail: data.contactEmail || undefined,
    phone: data.phone || undefined,
    role: data.role || 'CLIENT',
    permissions: data.permissions || [],
    clientId: data.clientId || undefined,
    access: data.access || NO_CLIENT_ACCESS,
    status: data.status || 'ACTIVE',
    mustChangePassword: Boolean(data.mustChangePassword),
    lastLoginAt: data.lastLoginAt || undefined,
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
    createdBy: data.createdBy || undefined,
  };
}

export async function currentProfile(): Promise<AppUser | null> {
  const user = auth.currentUser || (await waitForAuth());
  if (!user) return null;
  return loadProfile(user.uid);
}

/** Change your own password. Goes through the Worker so no re-auth dance is needed. */
export async function changeOwnPassword(newPassword: string): Promise<void> {
  await apiRequest('/api/admin/users/me/change-password', {
    method: 'POST',
    body: { password: newPassword },
  });
  // Claims are unchanged, but the profile flag is; force a token refresh so
  // the rest of the session sees the new state.
  await auth.currentUser?.getIdToken(true);
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(auth);
  authReady = null;
}

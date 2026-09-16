import type { AppUser, UserStatus } from '../domain/models.ts';
import type { ClientAccess, Permission, UserRole } from '../domain/roles.ts';
import { NO_CLIENT_ACCESS } from '../domain/roles.ts';
import { byNewest, listWhere, where } from './firestoreHelpers.ts';
import { apiRequest } from './apiClient.ts';

const PATH = 'users';

export interface UserInput {
  username: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  contactEmail?: string;
  phone?: string;
  role: UserRole;
  permissions: Permission[];
  clientId?: string;
  access: ClientAccess;
  mustChangePassword: boolean;
}

function normalise(raw: AppUser & { id: string }): AppUser {
  return {
    ...raw,
    permissions: raw.permissions || [],
    access: raw.access || NO_CLIENT_ACCESS,
    status: raw.status || 'ACTIVE',
    mustChangePassword: Boolean(raw.mustChangePassword),
  };
}

/**
 * Reading users is ordinary Firestore. Creating, deleting, re-roling and
 * resetting a password all go through the Worker, because the Firebase client
 * SDK signs you in as whoever you just created — which would throw the
 * administrator out of their own session — and because a browser must never
 * be the thing that decides what role a person has.
 */
export const userService = {
  async list(): Promise<AppUser[]> {
    const all = await listWhere<AppUser>(PATH);
    return all.map(normalise).sort(byNewest());
  },

  async listForClient(clientId: string): Promise<AppUser[]> {
    const all = await listWhere<AppUser>(PATH, [where('clientId', '==', clientId)]);
    return all.map(normalise).sort(byNewest());
  },

  async create(input: UserInput, password: string): Promise<{ uid: string; username: string }> {
    return apiRequest<{ uid: string; username: string }>('/api/admin/users', {
      method: 'POST',
      body: { ...input, password },
    });
  },

  async update(uid: string, input: Partial<UserInput>): Promise<void> {
    await apiRequest(`/api/admin/users/${uid}`, { method: 'PATCH', body: input });
  },

  async resetPassword(uid: string, password: string, mustChangePassword = true): Promise<void> {
    await apiRequest(`/api/admin/users/${uid}/reset-password`, {
      method: 'POST',
      body: { password, mustChangePassword },
    });
  },

  async setStatus(uid: string, status: UserStatus): Promise<void> {
    await apiRequest(`/api/admin/users/${uid}/${status === 'ACTIVE' ? 'enable' : 'disable'}`, {
      method: 'POST',
      body: {},
    });
  },

  async remove(uid: string): Promise<void> {
    await apiRequest(`/api/admin/users/${uid}`, { method: 'DELETE' });
  },
};

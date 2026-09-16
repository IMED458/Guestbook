/**
 * Roles and permissions.
 *
 * Three audiences use this system and they never see each other's surface:
 *   SUPER_ADMIN / STAFF → the business back office
 *   CLIENT             → their own events, albums, orders and nothing else
 *   guest              → no account at all; reaches a public page by QR
 *
 * A permission is only ever a *hint* to the UI. The same check is repeated in
 * firestore.rules and again in the Worker, because hiding a button is not
 * security.
 */

export type UserRole = 'SUPER_ADMIN' | 'STAFF' | 'CLIENT';

export const USER_ROLES: UserRole[] = ['SUPER_ADMIN', 'STAFF', 'CLIENT'];

/** Every discrete thing a staff member can be allowed to do. */
export const PERMISSIONS = [
  'orders.view',
  'orders.create',
  'orders.edit',
  'orders.delete',
  'clients.view',
  'clients.create',
  'clients.edit',
  'clients.delete',
  'events.view',
  'events.manage',
  'guestbooks.view',
  'guestbooks.manage',
  'albums.view',
  'albums.manage',
  'media.delete',
  'payments.view',
  'payments.edit',
  'catalog.view',
  'catalog.manage',
  'users.view',
  'users.manage',
  'emails.send',
  'requests.view',
  'requests.manage',
  'activity.view',
  'settings.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Convenience bundles the user-editor offers as one click. */
export const PERMISSION_GROUPS: { id: string; permissions: Permission[] }[] = [
  {
    id: 'orders',
    permissions: ['orders.view', 'orders.create', 'orders.edit', 'orders.delete'],
  },
  {
    id: 'clients',
    permissions: ['clients.view', 'clients.create', 'clients.edit', 'clients.delete'],
  },
  { id: 'events', permissions: ['events.view', 'events.manage'] },
  { id: 'guestbooks', permissions: ['guestbooks.view', 'guestbooks.manage'] },
  { id: 'albums', permissions: ['albums.view', 'albums.manage', 'media.delete'] },
  { id: 'payments', permissions: ['payments.view', 'payments.edit'] },
  { id: 'catalog', permissions: ['catalog.view', 'catalog.manage'] },
  { id: 'users', permissions: ['users.view', 'users.manage'] },
  { id: 'communication', permissions: ['emails.send', 'requests.view', 'requests.manage'] },
  { id: 'system', permissions: ['activity.view', 'settings.manage'] },
];

/** What a newly created STAFF member gets before anyone tunes it. */
export const DEFAULT_STAFF_PERMISSIONS: Permission[] = [
  'orders.view',
  'orders.create',
  'orders.edit',
  'clients.view',
  'clients.create',
  'clients.edit',
  'events.view',
  'guestbooks.view',
  'albums.view',
  'payments.view',
  'catalog.view',
  'requests.view',
];

/**
 * SUPER_ADMIN is not a permission list — it is an unconditional yes. Keeping
 * that as a branch rather than a generated list means a permission added later
 * cannot accidentally be missing from the owner of the system.
 */
export function hasPermission(
  role: UserRole | undefined,
  granted: readonly Permission[] | undefined,
  needed: Permission
): boolean {
  if (role === 'SUPER_ADMIN') return true;
  if (role !== 'STAFF') return false;
  return (granted || []).includes(needed);
}

export function hasAnyPermission(
  role: UserRole | undefined,
  granted: readonly Permission[] | undefined,
  needed: readonly Permission[]
): boolean {
  return needed.some((p) => hasPermission(role, granted, p));
}

export function isBackOffice(role: UserRole | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'STAFF';
}

/** What a client account is entitled to see in its own cabinet. */
export interface ClientAccess {
  guestbook: boolean;
  album: boolean;
  orders: boolean;
  payments: boolean;
}

export const NO_CLIENT_ACCESS: ClientAccess = {
  guestbook: false,
  album: false,
  orders: false,
  payments: false,
};

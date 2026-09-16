import { describe, expect, it } from 'vitest';
import { DEFAULT_STAFF_PERMISSIONS, hasAnyPermission, hasPermission, isBackOffice } from '../roles.ts';

describe('hasPermission', () => {
  it('gives SUPER_ADMIN everything, including permissions added later', () => {
    expect(hasPermission('SUPER_ADMIN', [], 'settings.manage')).toBe(true);
    expect(hasPermission('SUPER_ADMIN', undefined, 'users.manage')).toBe(true);
  });

  it('holds STAFF to their granted list', () => {
    expect(hasPermission('STAFF', ['orders.view'], 'orders.view')).toBe(true);
    expect(hasPermission('STAFF', ['orders.view'], 'orders.delete')).toBe(false);
  });

  it('never lets a CLIENT into a back-office permission', () => {
    expect(hasPermission('CLIENT', ['orders.view'], 'orders.view')).toBe(false);
    expect(hasPermission('CLIENT', undefined, 'clients.view')).toBe(false);
  });

  it('denies an unauthenticated caller', () => {
    expect(hasPermission(undefined, undefined, 'orders.view')).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  it('passes when one of the listed permissions is held', () => {
    expect(hasAnyPermission('STAFF', ['albums.view'], ['albums.view', 'albums.manage'])).toBe(true);
    expect(hasAnyPermission('STAFF', ['orders.view'], ['albums.view', 'albums.manage'])).toBe(false);
  });
});

describe('isBackOffice', () => {
  it('separates the back office from clients and guests', () => {
    expect(isBackOffice('SUPER_ADMIN')).toBe(true);
    expect(isBackOffice('STAFF')).toBe(true);
    expect(isBackOffice('CLIENT')).toBe(false);
    expect(isBackOffice(undefined)).toBe(false);
  });
});

describe('DEFAULT_STAFF_PERMISSIONS', () => {
  it('is read-only by default — no delete, no user management', () => {
    expect(DEFAULT_STAFF_PERMISSIONS).not.toContain('orders.delete');
    expect(DEFAULT_STAFF_PERMISSIONS).not.toContain('users.manage');
    expect(DEFAULT_STAFF_PERMISSIONS).not.toContain('settings.manage');
  });
});

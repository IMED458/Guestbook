import { describe, expect, it } from 'vitest';
import { buildPath, matchRoute, normalizeHash } from '../routes.ts';

describe('normalizeHash', () => {
  it('strips the hash, the leading slash, the query and the trailing slash', () => {
    expect(normalizeHash('#/admin/orders')).toBe('admin/orders');
    expect(normalizeHash('#/admin/orders/')).toBe('admin/orders');
    expect(normalizeHash('#/g/nika-ana?from=qr')).toBe('g/nika-ana');
    expect(normalizeHash('')).toBe('');
  });
});

describe('matchRoute', () => {
  it('matches the landing page', () => {
    expect(matchRoute('#/')?.definition.area).toBe('public');
  });

  it('separates a list route from its detail route by segment count', () => {
    expect(matchRoute('#/admin/orders')?.definition.pattern).toBe('admin/orders');

    const detail = matchRoute('#/admin/orders/ORD-2026-0001');
    expect(detail?.definition.pattern).toBe('admin/orders/:id');
    expect(detail?.params.id).toBe('ORD-2026-0001');
  });

  it('carries the permission an admin route needs', () => {
    expect(matchRoute('#/admin/users')?.definition.permissions).toEqual(['users.view']);
  });

  it('decodes a slug parameter', () => {
    expect(matchRoute('#/a/nika-da-anas-qorwili')?.params.slug).toBe('nika-da-anas-qorwili');
  });

  it('routes the three public QR surfaces separately', () => {
    expect(matchRoute('#/g/x')?.definition.pattern).toBe('g/:slug');
    expect(matchRoute('#/a/x')?.definition.pattern).toBe('a/:slug');
    expect(matchRoute('#/e/x')?.definition.pattern).toBe('e/:slug');
  });

  it('returns null for something unknown, so the app can show a not-found view', () => {
    expect(matchRoute('#/nope/nope/nope')).toBeNull();
  });
});

describe('buildPath', () => {
  it('fills parameters and encodes them', () => {
    expect(buildPath('admin/orders/:id', { id: 'ORD-1' })).toBe('#/admin/orders/ORD-1');
    expect(buildPath('g/:slug', { slug: 'a b' })).toBe('#/g/a%20b');
  });

  it('builds a bare path with no parameters', () => {
    expect(buildPath('admin/clients')).toBe('#/admin/clients');
  });
});

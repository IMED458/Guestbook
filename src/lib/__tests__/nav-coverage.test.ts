import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ADMIN_NAV, CLIENT_NAV } from '../nav.ts';
import { ROUTES } from '../routes.ts';

/**
 * A menu entry that leads nowhere is worse than one that is absent: it looks
 * like a feature and behaves like a bug. Both `admin/payments` and
 * `admin/guestbooks` shipped that way once, which is what these guard.
 */
describe('navigation coverage', () => {
  const adminRouter = readFileSync(new URL('../../pages/admin/AdminRouter.tsx', import.meta.url), 'utf8');
  const clientDashboard = readFileSync(new URL('../../pages/client/ClientDashboard.tsx', import.meta.url), 'utf8');

  const adminItems = ADMIN_NAV.flatMap((section) => section.items);

  it('renders a page for every admin menu entry', () => {
    const missing = adminItems.filter((item) => !adminRouter.includes(`case '${item.pattern}'`));
    expect(missing.map((m) => m.pattern)).toEqual([]);
  });

  it('handles every client menu entry', () => {
    // The client dashboard branches on the path rather than switching, and
    // 'client' itself is the default branch.
    const missing = CLIENT_NAV.filter(
      (item) => item.pattern !== 'client' && !clientDashboard.includes(`'${item.pattern}'`)
    );
    expect(missing.map((m) => m.pattern)).toEqual([]);
  });

  it('declares every menu destination in the route table', () => {
    const declared = new Set(ROUTES.map((r) => r.pattern));
    [...adminItems, ...CLIENT_NAV].forEach((item) => {
      expect(declared.has(item.pattern), `${item.pattern} missing from ROUTES`).toBe(true);
    });
  });

  it('gives every admin route a permission except the dashboard itself', () => {
    ROUTES.filter((r) => r.area === 'admin' && r.pattern !== 'admin').forEach((route) => {
      expect(route.permissions?.length, `${route.pattern} has no permission`).toBeGreaterThan(0);
    });
  });
});

import type { Permission } from '../domain/roles.ts';

/**
 * The route table.
 *
 * Hash routing stays: GitHub Pages serves one document, so `#/admin/orders/42`
 * survives a refresh and a shared link with no rewrite rules and no 404.html
 * guesswork. Every admin route names the permission it needs, so the sidebar
 * and the guard read from one list rather than drifting apart.
 */

export type RouteArea = 'public' | 'admin' | 'client' | 'auth';

export interface RouteDefinition {
  /** Pattern with :params, e.g. 'admin/orders/:id'. */
  pattern: string;
  area: RouteArea;
  /** Any one of these is enough to enter. Empty means role alone decides. */
  permissions?: Permission[];
  /** Translation key for the sidebar / page title. */
  labelKey: string;
}

export const ROUTES: RouteDefinition[] = [
  { pattern: '', area: 'public', labelKey: 'nav.home' },
  { pattern: 'login', area: 'auth', labelKey: 'nav.signIn' },
  { pattern: 'request', area: 'public', labelKey: 'nav.orderRequest' },

  { pattern: 'admin', area: 'admin', labelKey: 'nav.dashboard' },
  { pattern: 'admin/orders', area: 'admin', permissions: ['orders.view'], labelKey: 'nav.orders' },
  { pattern: 'admin/orders/:id', area: 'admin', permissions: ['orders.view'], labelKey: 'nav.orderDetails' },
  { pattern: 'admin/requests', area: 'admin', permissions: ['requests.view'], labelKey: 'nav.requests' },
  { pattern: 'admin/clients', area: 'admin', permissions: ['clients.view'], labelKey: 'nav.clients' },
  { pattern: 'admin/clients/:id', area: 'admin', permissions: ['clients.view'], labelKey: 'nav.clientDetails' },
  { pattern: 'admin/users', area: 'admin', permissions: ['users.view'], labelKey: 'nav.users' },
  { pattern: 'admin/events', area: 'admin', permissions: ['events.view'], labelKey: 'nav.events' },
  { pattern: 'admin/events/:id', area: 'admin', permissions: ['events.view'], labelKey: 'nav.eventDetails' },
  { pattern: 'admin/guestbooks', area: 'admin', permissions: ['guestbooks.view'], labelKey: 'nav.guestbooks' },
  { pattern: 'admin/albums', area: 'admin', permissions: ['albums.view'], labelKey: 'nav.albums' },
  { pattern: 'admin/albums/:id', area: 'admin', permissions: ['albums.view'], labelKey: 'nav.albumDetails' },
  { pattern: 'admin/catalog', area: 'admin', permissions: ['catalog.view'], labelKey: 'nav.catalog' },
  { pattern: 'admin/payments', area: 'admin', permissions: ['payments.view'], labelKey: 'nav.payments' },
  { pattern: 'admin/email', area: 'admin', permissions: ['emails.send'], labelKey: 'nav.email' },
  { pattern: 'admin/qr', area: 'admin', permissions: ['events.view'], labelKey: 'nav.qrStudio' },
  { pattern: 'admin/activity', area: 'admin', permissions: ['activity.view'], labelKey: 'nav.activity' },
  { pattern: 'admin/settings', area: 'admin', permissions: ['settings.manage'], labelKey: 'nav.settings' },

  { pattern: 'client', area: 'client', labelKey: 'nav.clientHome' },
  { pattern: 'client/events', area: 'client', labelKey: 'nav.myEvents' },
  { pattern: 'client/guestbook', area: 'client', labelKey: 'nav.myGuestbook' },
  { pattern: 'client/album', area: 'client', labelKey: 'nav.myAlbum' },
  { pattern: 'client/orders', area: 'client', labelKey: 'nav.myOrders' },
  { pattern: 'client/payments', area: 'client', labelKey: 'nav.myPayments' },
  { pattern: 'client/profile', area: 'client', labelKey: 'nav.myProfile' },

  { pattern: 'g/:slug', area: 'public', labelKey: 'nav.guestbookPublic' },
  { pattern: 'a/:slug', area: 'public', labelKey: 'nav.albumPublic' },
  { pattern: 'e/:slug', area: 'public', labelKey: 'nav.eventLanding' },
  { pattern: 'legal/:slug', area: 'public', labelKey: 'nav.legal' },
];

export interface MatchedRoute {
  definition: RouteDefinition;
  params: Record<string, string>;
}

/** Strip '#', a leading '/', and any query string. */
export function normalizeHash(hash: string): string {
  return hash.replace(/^#/, '').replace(/^\//, '').split('?')[0].replace(/\/$/, '');
}

export function matchRoute(hash: string): MatchedRoute | null {
  const path = normalizeHash(hash);
  const segments = path === '' ? [] : path.split('/');

  // Longest literal prefix wins, so 'admin/orders/:id' beats 'admin/orders'
  // only when the extra segment is actually present.
  for (const definition of ROUTES) {
    const patternSegments = definition.pattern === '' ? [] : definition.pattern.split('/');
    if (patternSegments.length !== segments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < patternSegments.length; i++) {
      const expected = patternSegments[i];
      if (expected.startsWith(':')) {
        params[expected.slice(1)] = decodeURIComponent(segments[i]);
      } else if (expected !== segments[i]) {
        matched = false;
        break;
      }
    }

    if (matched) return { definition, params };
  }

  return null;
}

export function buildPath(pattern: string, params: Record<string, string> = {}): string {
  const filled = pattern
    .split('/')
    .map((segment) =>
      segment.startsWith(':') ? encodeURIComponent(params[segment.slice(1)] ?? '') : segment
    )
    .join('/');
  return `#/${filled}`;
}

export function navigate(pattern: string, params: Record<string, string> = {}): void {
  window.location.hash = buildPath(pattern, params);
}

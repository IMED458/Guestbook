import type { Permission } from '../domain/roles.ts';

/**
 * The back-office sidebar.
 *
 * Each entry names the permission it needs, and the same list drives both the
 * menu and the route guard, so a link can never point somewhere the person is
 * refused. Labels are Georgian because this is the working UI of a Georgian
 * business; only code-level enums stay in English.
 */
export interface NavItem {
  label: string;
  pattern: string;
  icon: string;
  permission?: Permission;
  /** Rendered only for the owner of the system. */
  superAdminOnly?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavSection[] = [
  {
    items: [{ label: 'მთავარი', pattern: 'admin', icon: 'LayoutDashboard' }],
  },
  {
    title: 'გაყიდვები',
    items: [
      { label: 'შეკვეთები', pattern: 'admin/orders', icon: 'ClipboardList', permission: 'orders.view' },
      { label: 'ახალი მოთხოვნები', pattern: 'admin/requests', icon: 'Inbox', permission: 'requests.view' },
      { label: 'გადახდები', pattern: 'admin/payments', icon: 'Wallet', permission: 'payments.view' },
      { label: 'პროდუქტები და სერვისები', pattern: 'admin/catalog', icon: 'Package', permission: 'catalog.view' },
    ],
  },
  {
    title: 'ღონისძიებები',
    items: [
      { label: 'ღონისძიებები', pattern: 'admin/events', icon: 'CalendarDays', permission: 'events.view' },
      { label: 'სტუმრების წიგნები', pattern: 'admin/guestbooks', icon: 'BookHeart', permission: 'guestbooks.view' },
      { label: 'ციფრული ალბომები', pattern: 'admin/albums', icon: 'Images', permission: 'albums.view' },
      { label: 'QR დიზაინი', pattern: 'admin/qr', icon: 'QrCode', permission: 'events.view' },
    ],
  },
  {
    title: 'ხალხი',
    items: [
      { label: 'კლიენტები', pattern: 'admin/clients', icon: 'Users', permission: 'clients.view' },
      { label: 'მომხმარებლები', pattern: 'admin/users', icon: 'UserCog', permission: 'users.view' },
      { label: 'ელფოსტა', pattern: 'admin/email', icon: 'Mail', permission: 'emails.send' },
    ],
  },
  {
    title: 'სისტემა',
    items: [
      { label: 'აქტივობის ისტორია', pattern: 'admin/activity', icon: 'History', permission: 'activity.view' },
      { label: 'პარამეტრები', pattern: 'admin/settings', icon: 'Settings', superAdminOnly: true },
    ],
  },
];

/** A client only ever sees what their entitlements switched on. */
export interface ClientNavItem extends NavItem {
  requires?: 'guestbook' | 'album' | 'orders' | 'payments';
}

export const CLIENT_NAV: ClientNavItem[] = [
  { label: 'მთავარი', pattern: 'client', icon: 'LayoutDashboard' },
  { label: 'ჩემი ღონისძიებები', pattern: 'client/events', icon: 'CalendarDays' },
  { label: 'ჩემი სტუმრების წიგნი', pattern: 'client/guestbook', icon: 'BookHeart', requires: 'guestbook' },
  { label: 'ჩემი ალბომი', pattern: 'client/album', icon: 'Images', requires: 'album' },
  { label: 'ჩემი შეკვეთები', pattern: 'client/orders', icon: 'ClipboardList', requires: 'orders' },
  { label: 'გადახდები', pattern: 'client/payments', icon: 'Wallet', requires: 'payments' },
  { label: 'პროფილი', pattern: 'client/profile', icon: 'UserCircle' },
];

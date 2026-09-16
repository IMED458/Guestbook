import React, { useState } from 'react';
import {
  Activity,
  BookOpen,
  Calendar,
  Camera,
  CreditCard,
  ExternalLink,
  Inbox,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  QrCode,
  Settings,
  ShoppingBag,
  Tag,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { ADMIN_NAV } from '../../lib/nav.ts';
import { buildPath, navigate, normalizeHash } from '../../lib/routes.ts';
import { useSession } from '../../lib/session.tsx';
import { useBranding } from '../../lib/branding.tsx';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard: LayoutGrid,
  ClipboardList: ShoppingBag,
  Inbox,
  Wallet: CreditCard,
  Package: Tag,
  CalendarDays: Calendar,
  BookHeart: BookOpen,
  Images: Camera,
  QrCode,
  Users,
  UserCog,
  Mail,
  History: Activity,
  Settings,
};

/** The first letter of whoever is signed in, for the avatar disc. */
function initial(value: string): string {
  return (value.trim()[0] || '?').toUpperCase();
}

/**
 * The back-office shell: a near-black rail against a pale working area.
 *
 * The rail is quiet so the content carries the colour, and exactly one thing
 * is ever crimson — the section you are in. Using the accent for anything
 * else would make the highlight stop reading as "you are here".
 */
export const AdminLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({
  children,
  title,
}) => {
  const { user, can, isSuperAdmin, signOut } = useSession();
  const brand = useBranding();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentPath = normalizeHash(window.location.hash);
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.username || '';

  const items = ADMIN_NAV.flatMap((section) => section.items).filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (!item.permission) return true;
    return can(item.permission);
  });

  const go = (pattern: string) => {
    navigate(pattern);
    setMobileOpen(false);
  };

  const rail = (
    <div className="flex flex-col h-full bg-stone-950">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-[13px] tracking-tight shrink-0">
          MB
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-white text-[15px] leading-tight truncate">
            {brand.productName}
          </span>
          <span className="block font-mono text-[10px] text-stone-500 truncate">
            Georgia Admin v2.0
          </span>
        </span>
      </div>

      {/* Who is signed in */}
      <div className="mx-3 mb-4 rounded-2xl border border-stone-800 bg-stone-900/70 px-3 py-3 flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-rose-600/15 text-rose-400 flex items-center justify-center font-semibold text-sm shrink-0">
          {initial(displayName)}
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-white truncate">{displayName}</span>
          <span className="block text-[11px] text-rose-400">
            {isSuperAdmin ? 'სუპერ ადმინი' : 'თანამშრომელი'}
          </span>
        </span>
      </div>

      <nav aria-label="სამართავი მენიუ" className="flex-1 overflow-y-auto px-3 pb-3">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = ICONS[item.icon] || LayoutGrid;
            const active =
              currentPath === item.pattern ||
              (item.pattern !== 'admin' && currentPath.startsWith(`${item.pattern}/`));

            return (
              <li key={item.pattern}>
                <a
                  href={buildPath(item.pattern)}
                  onClick={(e) => {
                    e.preventDefault();
                    go(item.pattern);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${
                    active
                      ? 'bg-rose-600 text-white font-semibold shadow-[0_2px_12px_rgba(225,29,72,0.35)]'
                      : 'text-stone-400 hover:bg-stone-900 hover:text-stone-100'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-stone-800 p-3 space-y-0.5">
        <a
          href="#/request"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] text-stone-400 hover:bg-stone-900 hover:text-stone-100 transition-colors"
        >
          <ExternalLink className="w-[18px] h-[18px] shrink-0" />
          საიტის ნახვა
        </a>
        <button
          type="button"
          onClick={() => void signOut().then(() => navigate('login'))}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] text-rose-500 hover:bg-rose-950/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          სისტემიდან გამოსვლა
        </button>
      </div>
    </div>
  );

  const activeLabel = items.find((i) => i.pattern === currentPath)?.label;

  return (
    <div className="min-h-screen bg-stone-100 flex">
      <aside className="hidden lg:block w-[260px] shrink-0">
        <div className="fixed top-0 bottom-0 w-[260px]">{rail}</div>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-stone-950/60" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="relative w-[260px]">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="მენიუს დახურვა"
              className="absolute top-4 right-3 z-10 p-1.5 text-stone-500 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            {rail}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-stone-200/80 px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="მენიუს გახსნა"
            className="lg:hidden p-1.5 text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          <h1 className="font-serif text-lg font-bold text-stone-900 truncate">
            {title || activeLabel || 'მიმოხილვა'}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('client')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-[13px] font-medium text-stone-800 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              კლიენტის კაბინეტი
            </button>

            <a
              href="#/request"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-[13px] font-medium text-stone-800 hover:bg-stone-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              საჯარო გვერდი
            </a>

            <span className="flex items-center gap-2.5 pl-2 sm:pl-3 sm:border-l border-stone-200">
              <span className="w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center font-semibold text-[13px]">
                {initial(displayName)}
              </span>
              <span className="hidden sm:block leading-tight">
                <span className="block text-[13px] font-semibold text-stone-900">
                  {isSuperAdmin ? 'მთავარი ადმინისტრატორი' : displayName}
                </span>
                <span className="block text-[11px] text-stone-500">@{user?.username}</span>
              </span>
            </span>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};

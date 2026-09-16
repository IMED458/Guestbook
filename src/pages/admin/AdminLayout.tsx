import React, { useState } from 'react';
import {
  BookHeart,
  CalendarDays,
  ClipboardList,
  History,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  QrCode,
  Settings,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { ADMIN_NAV } from '../../lib/nav.ts';
import { buildPath, navigate, normalizeHash } from '../../lib/routes.ts';
import { useSession } from '../../lib/session.tsx';
import { SITE } from '../../lib/site-config.ts';

const ICONS: Record<string, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  LayoutDashboard,
  ClipboardList,
  Inbox,
  Wallet,
  Package,
  CalendarDays,
  BookHeart,
  Images,
  QrCode,
  Users,
  UserCog,
  Mail,
  History,
  Settings,
};

/**
 * The back-office shell: a compact, desktop-first sidebar over a content well.
 * Deliberately plain — this is software people sit in front of all day, so it
 * favours density and legibility over decoration.
 */
export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, can, isSuperAdmin, signOut } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentPath = normalizeHash(window.location.hash);

  const visibleSections = ADMIN_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.superAdminOnly) return isSuperAdmin;
      if (!item.permission) return true;
      return can(item.permission);
    }),
  })).filter((section) => section.items.length > 0);

  const handleNavigate = (pattern: string) => {
    navigate(pattern);
    setMobileOpen(false);
  };

  const sidebar = (
    <nav aria-label="სამართავი მენიუ" className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-stone-800">
        <span className="block text-sm font-semibold text-white">{SITE.productName}</span>
        <span className="block text-[11px] text-stone-400 mt-0.5">სამართავი პანელი</span>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {visibleSections.map((section, index) => (
          <div key={section.title || index} className="mb-4 last:mb-0">
            {section.title && (
              <h2 className="px-4 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {section.title}
              </h2>
            )}
            <ul>
              {section.items.map((item) => {
                const Icon = ICONS[item.icon] || LayoutDashboard;
                // 'admin' must not light up for every 'admin/...' child.
                const active =
                  currentPath === item.pattern ||
                  (item.pattern !== 'admin' && currentPath.startsWith(`${item.pattern}/`));

                return (
                  <li key={item.pattern}>
                    <a
                      href={buildPath(item.pattern)}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate(item.pattern);
                      }}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-300 ${
                        active
                          ? 'bg-stone-800 text-white font-semibold border-l-2 border-amber-400 pl-[14px]'
                          : 'text-stone-300 hover:bg-stone-800/60 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden={true} />
                      <span className="truncate">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-stone-800 p-3">
        <div className="px-1 pb-2">
          <span className="block text-[13px] font-medium text-white truncate">
            {user ? `${user.firstName} ${user.lastName}`.trim() || user.username : ''}
          </span>
          <span className="block text-[11px] text-stone-400">
            {user?.role === 'SUPER_ADMIN' ? 'სუპერ ადმინისტრატორი' : 'თანამშრომელი'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            void signOut().then(() => navigate('login'));
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-stone-300 hover:bg-stone-800 hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span>გასვლა</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-stone-100 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-stone-900 flex-col">{sidebar}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-stone-950/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 bg-stone-900 flex flex-col">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="მენიუს დახურვა"
              className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden bg-stone-900 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="მენიუს გახსნა"
            className="p-1.5 text-stone-300 hover:text-white rounded-lg cursor-pointer"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold text-white">{SITE.productName}</span>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};

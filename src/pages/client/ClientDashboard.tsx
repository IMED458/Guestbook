import React, { useCallback, useEffect, useState } from 'react';
import {
  BookHeart,
  CalendarDays,
  ClipboardList,
  Copy,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  UserCircle,
  Wallet,
  X,
} from 'lucide-react';
import type { Album, EventRecord, Order } from '../../domain/models.ts';
import { CLIENT_NAV } from '../../lib/nav.ts';
import { buildPath, navigate, normalizeHash } from '../../lib/routes.ts';
import { useSession } from '../../lib/session.tsx';
import { albumService, eventService } from '../../services/eventService.ts';
import { orderService } from '../../services/orderService.ts';
import { changeOwnPassword } from '../../services/authService.ts';
import { formatBytes, mediaService } from '../../services/mediaService.ts';
import { formatGel } from '../../domain/money.ts';
import { formatDateShort } from '../../domain/dates.ts';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONE,
} from '../../domain/labels.ts';
import { publicAlbumUrl, publicGuestBookUrl } from '../../lib/urls.ts';
import { SITE } from '../../lib/site-config.ts';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { EmptyState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, CalendarDays, BookHeart, Images, ClipboardList, Wallet, UserCircle,
};

/**
 * The client's own cabinet. It shows exactly what their entitlements switched
 * on and nothing else: no other customers, no internal notes, no staff, no
 * margins. A client who was not granted a guest book never sees the word.
 */
export const ClientDashboard: React.FC = () => {
  const { user, ready, isClient, signOut, refresh } = useSession();
  const toast = useToast();

  const [path, setPath] = useState(() => normalizeHash(window.location.hash));
  const [mobileOpen, setMobileOpen] = useState(false);

  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [newPassword, setNewPassword] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const onChange = () => setPath(normalizeHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate('login');
    else if (!isClient) navigate('admin');
  }, [ready, user, isClient]);

  const load = useCallback(async () => {
    if (!user?.clientId) return;
    try {
      const [eventList, albumList, orderList] = await Promise.all([
        eventService.listForClient(user.clientId),
        user.access.album ? albumService.listForClient(user.clientId) : Promise.resolve([]),
        user.access.orders ? orderService.listForClient(user.clientId) : Promise.resolve([]),
      ]);
      setEvents(eventList);
      setAlbums(albumList);
      setOrders(orderList);
    } catch (err) {
      console.error('client data load failed', err);
      setEvents([]);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast.error('პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს');
      return;
    }
    setChanging(true);
    try {
      await changeOwnPassword(newPassword);
      await refresh();
      setNewPassword('');
      toast.success('პაროლი შეიცვალა');
    } catch (err) {
      console.error('password change failed', err);
      toast.error(err instanceof Error ? err.message : 'პაროლის შეცვლა ვერ მოხერხდა');
    } finally {
      setChanging(false);
    }
  };

  const copy = (label: string, value: string) => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} დაკოპირდა`);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <p className="text-sm text-stone-600">იტვირთება...</p>
      </div>
    );
  }
  if (!user || !isClient) return null;

  const items = CLIENT_NAV.filter((item) => !item.requires || user.access[item.requires]);

  const nav = (
    <nav aria-label="მენიუ" className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-stone-200">
        <span className="block text-sm font-semibold text-stone-900">{SITE.productName}</span>
        <span className="block text-[11px] text-stone-600 mt-0.5">პირადი კაბინეტი</span>
      </div>

      <ul className="flex-1 py-3">
        {items.map((item) => {
          const Icon = ICONS[item.icon] || LayoutDashboard;
          const active = path === item.pattern;
          return (
            <li key={item.pattern}>
              <a
                href={buildPath(item.pattern)}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.pattern);
                  setMobileOpen(false);
                }}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors ${
                  active ? 'bg-stone-100 text-stone-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-stone-200 p-3">
        <p className="px-1 pb-2 text-[13px] font-medium text-stone-900 truncate">
          {`${user.firstName} ${user.lastName}`.trim() || user.username}
        </p>
        <button
          type="button"
          onClick={() => void signOut().then(() => navigate('login'))}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-stone-700 hover:bg-stone-100 cursor-pointer"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          გასვლა
        </button>
      </div>
    </nav>
  );

  const mustChange = user.mustChangePassword;

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <aside className="hidden lg:flex w-56 shrink-0 bg-white border-r border-stone-200 flex-col">{nav}</aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-stone-950/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="relative w-60 bg-white flex flex-col">
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="მენიუს დახურვა" className="absolute top-3 right-3 p-1.5 text-stone-500 cursor-pointer">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="lg:hidden bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="მენიუს გახსნა" className="p-1.5 text-stone-700 cursor-pointer">
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold text-stone-900">{SITE.productName}</span>
        </header>

        <main id="main-content" tabIndex={-1} className="p-6 lg:p-8 max-w-4xl">
          {mustChange && path !== 'client/profile' && (
            <div role="alert" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">პაროლის შეცვლა საჭიროა</p>
              <p className="mt-1 text-[13px] text-amber-900 leading-relaxed">
                თქვენ დროებითი პაროლით შემოხვედით. უსაფრთხოებისთვის დააყენეთ ახალი.
              </p>
              <button type="button" onClick={() => navigate('client/profile')} className={`${primaryButton} mt-3`}>
                პაროლის შეცვლა
              </button>
            </div>
          )}

          {path === 'client/profile' ? (
            <>
              <h1 className="text-2xl font-semibold text-stone-900 mb-6">პროფილი</h1>
              <section className="bg-white border border-stone-200 rounded-xl p-5 max-w-md">
                <dl className="space-y-2 text-[13px] mb-5">
                  {[
                    ['მომხმარებელი', user.username],
                    ['სახელი', `${user.firstName} ${user.lastName}`.trim()],
                    ['ელფოსტა', user.contactEmail || '—'],
                    ['ტელეფონი', user.phone || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 py-1 border-b border-stone-100 last:border-0">
                      <dt className="text-stone-600">{label}</dt>
                      <dd className="font-medium text-stone-900">{value}</dd>
                    </div>
                  ))}
                </dl>

                <Field id="new-password" label="ახალი პაროლი" hint="მინიმუმ 8 სიმბოლო.">
                  {(d) => (
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      aria-describedby={d}
                      className={inputClass}
                    />
                  )}
                </Field>
                <button type="button" onClick={handlePasswordChange} disabled={changing} className={`${primaryButton} mt-3 w-full`}>
                  {changing ? 'იცვლება...' : 'პაროლის შეცვლა'}
                </button>
              </section>
            </>
          ) : path === 'client/orders' ? (
            <>
              <h1 className="text-2xl font-semibold text-stone-900 mb-6">ჩემი შეკვეთები</h1>
              {orders.length === 0 ? (
                <div className="bg-white border border-stone-200 rounded-xl"><EmptyState title="შეკვეთა ჯერ არ არის" /></div>
              ) : (
                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-stone-50 border-b border-stone-200">
                      <tr>
                        <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">ნომერი</th>
                        <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">სტატუსი</th>
                        <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">თანხა</th>
                        <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">დარჩენილი</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-stone-100 last:border-0">
                          <td className="px-4 py-3 font-mono text-stone-900">{order.orderNumber}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${ORDER_STATUS_TONE[order.orderStatus]}`}>
                              {ORDER_STATUS_LABELS[order.orderStatus]}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-stone-900">{formatGel(order.total)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${PAYMENT_STATUS_TONE[order.paymentStatus]}`}>
                              {formatGel(order.balance)} · {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-stone-900">
                {path === 'client/album' ? 'ჩემი ალბომი' : path === 'client/guestbook' ? 'ჩემი სტუმრების წიგნი' : 'მთავარი'}
              </h1>
              <p className="mt-1 text-sm text-stone-600 mb-6">
                გამარჯობა, {user.firstName || user.username}.
              </p>

              {events === null ? (
                <LoadingState />
              ) : events.length === 0 ? (
                <div className="bg-white border border-stone-200 rounded-xl">
                  <EmptyState title="ღონისძიება ჯერ არ არის" hint="როგორც კი ღონისძიება შეიქმნება, აქ გამოჩნდება ბმულები და QR კოდები." />
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => {
                    const album = albums.find((a) => a.eventId === event.id);
                    return (
                      <section key={event.id} className="bg-white border border-stone-200 rounded-xl p-5">
                        <h2 className="text-base font-semibold text-stone-900">{event.title}</h2>
                        <p className="mt-0.5 text-[13px] text-stone-600">{formatDateShort(event.eventDate)}</p>

                        <div className="mt-4 space-y-2.5">
                          {user.access.guestbook && event.hasGuestbook && (
                            <LinkRow
                              icon={<BookHeart className="w-4 h-4 text-rose-600" aria-hidden="true" />}
                              label="სტუმრების წიგნი"
                              url={publicGuestBookUrl(event.slug)}
                              onCopy={copy}
                            />
                          )}
                          {user.access.album && event.hasAlbum && (
                            <>
                              <LinkRow
                                icon={<Images className="w-4 h-4 text-indigo-600" aria-hidden="true" />}
                                label="ციფრული ალბომი"
                                url={publicAlbumUrl(event.slug)}
                                onCopy={copy}
                              />
                              {album && (
                                <p className="text-[12px] text-stone-600 pl-6">
                                  {album.stats.fileCount || 0} ფაილი · {formatBytes(album.stats.totalBytes || 0)}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

const LinkRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  url: string;
  onCopy: (label: string, url: string) => void;
}> = ({ icon, label, url, onCopy }) => (
  <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-900">
      {icon}
      {label}
    </p>
    <p className="mt-1 font-mono text-[11px] text-stone-700 break-all">{url}</p>
    <div className="mt-2 flex gap-2">
      <button type="button" onClick={() => onCopy(label, url)} className={`${secondaryButton} !py-1 !px-2.5 inline-flex items-center gap-1.5 !text-[12px]`}>
        <Copy className="w-3 h-3" aria-hidden="true" />
        კოპირება
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" className={`${secondaryButton} !py-1 !px-2.5 inline-flex items-center gap-1.5 !text-[12px]`}>
        <QrCode className="w-3 h-3" aria-hidden="true" />
        გახსნა
      </a>
    </div>
  </div>
);

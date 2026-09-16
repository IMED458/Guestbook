import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  Camera,
  CreditCard,
  Plus,
  QrCode,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { Album, Client, EventRecord, Order, OrderRequest, Payment } from '../../domain/models.ts';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, PAYMENT_STATUS_TONE, REQUEST_STATUS_LABELS } from '../../domain/labels.ts';
import { formatGel } from '../../domain/money.ts';
import { formatDateShort, toDateInputValue } from '../../domain/dates.ts';
import { orderService, paymentService } from '../../services/orderService.ts';
import { clientService } from '../../services/clientService.ts';
import { albumService, eventService } from '../../services/eventService.ts';
import { guestbookService } from '../../services/guestbookService.ts';
import { requestService } from '../../services/systemService.ts';
import { formatBytes } from '../../services/mediaService.ts';
import { useSession } from '../../lib/session.tsx';
import { navigate } from '../../lib/routes.ts';
import { Pill } from '../../components/ui/Card.tsx';
import { LoadingState } from '../../components/ui/DataState.tsx';

interface Data {
  orders: Order[];
  payments: Payment[];
  clients: Client[];
  events: EventRecord[];
  albums: Album[];
  guestbooks: { id: string; viewsTotal?: number }[];
  requests: OrderRequest[];
}

/** A figure with its own tinted glyph, as on the mockup. */
const StatCard: React.FC<{
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tint: string;
  onClick?: () => void;
}> = ({ label, value, hint, icon, tint, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`w-full text-left rounded-2xl border border-stone-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] ${
        onClick ? 'hover:border-stone-300 hover:shadow-[0_4px_16px_rgba(28,25,23,0.07)] transition-all cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] text-stone-600">{label}</span>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>{icon}</span>
      </div>
      <p className="mt-3 font-serif text-[30px] font-bold text-stone-900 leading-none">{value}</p>
      {hint && <p className="mt-2 text-[11.5px] text-stone-500">{hint}</p>}
    </Tag>
  );
};

export const DashboardPage: React.FC = () => {
  const { can } = useSession();
  const [data, setData] = useState<Data | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    // Each source is allowed to fail on its own: a staff member without the
    // payments permission should still get a dashboard, not an error page.
    const [orders, payments, clients, events, albums, guestbooks, requests] = await Promise.all([
      orderService.list().catch(() => []),
      paymentService.listAll().catch(() => []),
      clientService.list().catch(() => []),
      eventService.list().catch(() => []),
      albumService.list().catch(() => []),
      guestbookService.list().catch(() => []),
      requestService.list().catch(() => []),
    ]);
    setData({ orders, payments, clients, events, albums, guestbooks, requests });
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return <div className="p-6 lg:p-8"><LoadingState /></div>;
  }

  const month = toDateInputValue(new Date()).slice(0, 7);
  const revenue = data.payments.reduce((sum, p) => sum + p.amount, 0);
  const monthRevenue = data.payments.filter((p) => p.paidAt.slice(0, 7) === month).reduce((sum, p) => sum + p.amount, 0);
  const outstanding = data.orders.reduce((sum, o) => sum + Math.max(0, o.balance), 0);
  const activeOrders = data.orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.orderStatus));
  const inProgress = activeOrders.filter((o) => o.orderStatus === 'IN_PROGRESS').length;
  const albumFiles = data.albums.reduce((n, a) => n + (a.stats?.fileCount || 0), 0);
  const albumBytes = data.albums.reduce((n, a) => n + (a.stats?.totalBytes || 0), 0);
  const bookViews = data.guestbooks.reduce((n, b) => n + (b.viewsTotal || 0), 0);
  const newRequests = data.requests.filter((r) => r.status === 'NEW');

  interface QuickAction {
    label: string;
    icon: React.ReactNode;
    to: string;
    primary?: boolean;
    accent?: boolean;
  }

  const actions: (QuickAction | false | undefined)[] = [
    can('orders.create') && { label: 'ახალი შეკვეთა', icon: <Plus className="w-4 h-4" aria-hidden="true" />, to: 'admin/orders', primary: true },
    can('clients.create') && { label: 'ახალი კლიენტი', icon: <Users className="w-4 h-4" aria-hidden="true" />, to: 'admin/clients' },
    can('events.manage') && { label: 'ახალი ღონისძიება', icon: <Sparkles className="w-4 h-4" aria-hidden="true" />, to: 'admin/events' },
    can('events.view') && { label: 'QR სტუდია', icon: <QrCode className="w-4 h-4" aria-hidden="true" />, to: 'admin/qr', accent: true },
  ];

  const visibleActions = actions.filter((a): a is QuickAction => Boolean(a));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Hero */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-[26px] font-bold text-stone-900 flex items-center gap-2.5">
              სისტემის მიმოხილვა
              <button
                type="button"
                onClick={load}
                aria-label="განახლება"
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            </h2>
            <p className="mt-1 text-[13.5px] text-stone-600">
              დღევანდელი მდგომარეობა: შეკვეთები, კლიენტები, ფინანსები და მედია
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {visibleActions.map((action) => (
              <button
                key={action.to + action.label}
                type="button"
                onClick={() => navigate(action.to)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer ${
                  action.primary
                    ? 'bg-stone-900 text-white hover:bg-stone-800'
                    : action.accent
                      ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50'
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Money and volume */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="სულ შემოსავალი"
          value={formatGel(revenue)}
          hint={<>მიმდინარე თვეში: <strong className="font-semibold text-emerald-700">{formatGel(monthRevenue)}</strong></>}
          icon={<TrendingUp className="w-[18px] h-[18px] text-emerald-600" aria-hidden="true" />}
          tint="bg-emerald-50"
          onClick={can('payments.view') ? () => navigate('admin/payments') : undefined}
        />
        <StatCard
          label="მისაღები ბალანსი (დავალიანება)"
          value={formatGel(outstanding)}
          hint="კლიენტების მიმდინარე დავალიანება"
          icon={<CreditCard className="w-[18px] h-[18px] text-rose-600" aria-hidden="true" />}
          tint="bg-rose-50"
          onClick={can('orders.view') ? () => navigate('admin/orders') : undefined}
        />
        <StatCard
          label="აქტიური შეკვეთები"
          value={String(activeOrders.length)}
          hint={`სულ: ${data.orders.length} | მზადაა: ${data.orders.filter((o) => o.orderStatus === 'READY').length}`}
          icon={<ShoppingBag className="w-[18px] h-[18px] text-sky-600" aria-hidden="true" />}
          tint="bg-sky-50"
          onClick={can('orders.view') ? () => navigate('admin/orders') : undefined}
        />
        <StatCard
          label="კლიენტები & ღონისძიებები"
          value={String(data.clients.length)}
          hint={`ღონისძიება: ${data.events.length} | პროცესში: ${inProgress}`}
          icon={<Users className="w-[18px] h-[18px] text-violet-600" aria-hidden="true" />}
          tint="bg-violet-50"
          onClick={can('clients.view') ? () => navigate('admin/clients') : undefined}
        />
      </div>

      {/* Products */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="ციფრული ალბომები"
          value={`${data.albums.length} ალბომი`}
          hint={`${albumFiles} ორიგინალი ფაილი (${formatBytes(albumBytes)})`}
          icon={<Camera className="w-[18px] h-[18px] text-rose-600" aria-hidden="true" />}
          tint="bg-rose-50"
          onClick={can('albums.view') ? () => navigate('admin/albums') : undefined}
        />
        <StatCard
          label="სტუმრების წიგნები"
          value={`${data.guestbooks.length} წიგნი`}
          hint={`${bookViews} ნახვა`}
          icon={<BookOpen className="w-[18px] h-[18px] text-amber-600" aria-hidden="true" />}
          tint="bg-amber-50"
          onClick={can('guestbooks.view') ? () => navigate('admin/guestbooks') : undefined}
        />
        <StatCard
          label="ახალი მოთხოვნები საიტიდან"
          value={`${newRequests.length} ახალი`}
          hint={newRequests.length === 0 ? 'ყველა დამუშავებულია' : 'დაუკავშირდით კლიენტებს'}
          icon={<ArrowUpRight className="w-[18px] h-[18px] text-sky-600" aria-hidden="true" />}
          tint="bg-sky-50"
          onClick={can('requests.view') ? () => navigate('admin/requests') : undefined}
        />
      </div>

      {/* Recent work */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-stone-200/90 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)] overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 py-4">
            <div>
              <h3 className="font-serif text-[17px] font-bold text-stone-900">ბოლო შეკვეთები</h3>
              <p className="text-[12px] text-stone-600">მიმდინარე და ბოლო რეგისტრირებული შეკვეთები</p>
            </div>
            {can('orders.view') && (
              <button type="button" onClick={() => navigate('admin/orders')} className="text-[13px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer shrink-0">
                ყველას ნახვა →
              </button>
            )}
          </div>

          {data.orders.length === 0 ? (
            <p className="px-5 py-12 text-center text-[13px] text-stone-500">
              შეკვეთები არ არის რეგისტრირებული
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-y border-stone-100 bg-stone-50/60">
                  <tr>
                    {['ნომერი', 'კლიენტი', 'სტატუსი', 'თანხა', 'ბალანსი'].map((h) => (
                      <th key={h} scope="col" className="px-5 py-2.5 font-semibold text-stone-600 text-[12px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.orders.slice(0, 6).map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => navigate('admin/orders/:id', { id: order.id })}
                      className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60 cursor-pointer"
                    >
                      <td className="px-5 py-3 font-mono font-medium text-stone-900 whitespace-nowrap">{order.orderNumber}</td>
                      <td className="px-5 py-3 text-stone-800">{order.customerName}</td>
                      <td className="px-5 py-3">
                        <Pill className={ORDER_STATUS_TONE[order.orderStatus]}>{ORDER_STATUS_LABELS[order.orderStatus]}</Pill>
                      </td>
                      <td className="px-5 py-3 font-semibold text-stone-900 whitespace-nowrap">{formatGel(order.total)}</td>
                      <td className="px-5 py-3">
                        <Pill className={PAYMENT_STATUS_TONE[order.paymentStatus]}>{formatGel(order.balance)}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200/90 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)] overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 py-4">
            <div>
              <h3 className="font-serif text-[17px] font-bold text-stone-900">ონლაინ მოთხოვნები</h3>
              <p className="text-[12px] text-stone-600">პოტენციური კლიენტები</p>
            </div>
            {can('requests.view') && (
              <button type="button" onClick={() => navigate('admin/requests')} className="text-[13px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer shrink-0">
                მეტის ნახვა
              </button>
            )}
          </div>

          {data.requests.length === 0 ? (
            <p className="px-5 py-12 text-center text-[13px] text-stone-500">ახალი მოთხოვნები არ არის</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {data.requests.slice(0, 6).map((request) => (
                <li key={request.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-stone-900 truncate">{request.name}</p>
                      <p className="text-[11px] text-stone-600">{request.phone} · {formatDateShort(request.createdAt)}</p>
                    </div>
                    <Pill className={request.status === 'NEW' ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-stone-100 text-stone-700 border-stone-300'}>
                      {REQUEST_STATUS_LABELS[request.status]}
                    </Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

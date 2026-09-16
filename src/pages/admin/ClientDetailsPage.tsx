import React, { useCallback, useEffect, useState } from 'react';
import {
  BookHeart,
  CalendarPlus,
  Images,
  KeyRound,
  Mail,
  Phone,
  Plus,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { AppUser, Client, EventRecord, Order, Payment } from '../../domain/models.ts';
import { userService } from '../../services/userService.ts';
import { clientService } from '../../services/clientService.ts';
import { eventService } from '../../services/eventService.ts';
import { orderService, paymentService } from '../../services/orderService.ts';
import { generateTemporaryPassword, normalizeUsername, validateUsername } from '../../domain/username.ts';
import { NO_CLIENT_ACCESS } from '../../domain/roles.ts';
import { formatGel } from '../../domain/money.ts';
import { formatDateShort } from '../../domain/dates.ts';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONE,
  USER_STATUS_LABELS,
} from '../../domain/labels.ts';
import { useSession } from '../../lib/session.tsx';
import { navigate } from '../../lib/routes.ts';
import { publicAlbumUrl, publicGuestBookUrl } from '../../lib/urls.ts';
import { Card, CardHeader, PageHeader, Pill, StatTile } from '../../components/ui/Card.tsx';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { Modal, primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import { CredentialsModal } from '../../components/admin/CredentialsModal.tsx';
import { QuickEmailModal } from '../../components/admin/QuickEmailModal.tsx';

/**
 * Everything about one client on one screen: contacts, their login accounts,
 * events, orders, payments and what they still owe — plus the actions that
 * start from here rather than from four other pages.
 */
export const ClientDetailsPage: React.FC<{ clientId: string }> = ({ clientId }) => {
  const { user, can, isSuperAdmin } = useSession();
  const toast = useToast();

  const [client, setClient] = useState<Client | null | 'missing'>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [userOpen, setUserOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [access, setAccess] = useState({ ...NO_CLIENT_ACCESS });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);

  const [emailOpen, setEmailOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const found = await clientService.get(clientId);
      if (!found) {
        setClient('missing');
        return;
      }
      setClient(found);

      const [userList, eventList, orderList, paymentList] = await Promise.all([
        userService.listForClient(clientId).catch(() => []),
        eventService.listForClient(clientId).catch(() => []),
        orderService.listForClient(clientId).catch(() => []),
        paymentService.listForClient(clientId).catch(() => []),
      ]);
      setUsers(userList);
      setEvents(eventList);
      setOrders(orderList);
      setPayments(paymentList);
    } catch (err) {
      console.error('client details load failed', err);
      setError('კლიენტის ჩატვირთვა ვერ მოხერხდა');
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openUserForm = () => {
    if (client === null || client === 'missing') return;
    // Suggest a username from the name, so the usual case is one click.
    const suggestion = normalizeUsername(
      (client.displayName || '')
        .replace(/[^A-Za-z0-9 ]/g, '')
        .trim()
        .split(/\s+/)
        .join('.')
    );
    setUsername(/^[a-z]/.test(suggestion) ? suggestion.slice(0, 32) : '');
    setPassword(generateTemporaryPassword());
    setAccess({ guestbook: events.some((e) => e.hasGuestbook), album: events.some((e) => e.hasAlbum), orders: true, payments: true });
    setFormError(null);
    setUserOpen(true);
  };

  const createUser = async () => {
    if (client === null || client === 'missing') return;

    const normalized = normalizeUsername(username);
    const check = validateUsername(normalized);
    if (!check.valid) {
      setFormError('მომხმარებელი უნდა იწყებოდეს ლათინური ასოთი და იყოს 3-32 სიმბოლო');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await userService.create(
        {
          username: normalized,
          firstName: client.firstName || client.displayName,
          lastName: client.lastName || '',
          companyName: client.companyName,
          contactEmail: client.email,
          phone: client.phone,
          role: 'CLIENT',
          permissions: [],
          clientId: client.id,
          access,
          mustChangePassword: true,
        },
        password
      );
      setCredentials({ username: normalized, password });
      setUserOpen(false);
      toast.success('მომხმარებელი შეიქმნა');
      await load();
    } catch (err) {
      console.error('user create failed', err);
      setFormError(err instanceof Error ? err.message : 'შექმნა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (target: AppUser) => {
    const next = generateTemporaryPassword();
    try {
      await userService.resetPassword(target.id, next);
      setCredentials({ username: target.username, password: next });
      toast.success('პაროლი შეიცვალა');
      await load();
    } catch (err) {
      console.error('reset failed', err);
      toast.error('პაროლის შეცვლა ვერ მოხერხდა');
    }
  };

  if (error) return <div className="p-6 lg:p-8"><ErrorState message={error} onRetry={load} /></div>;
  if (client === null) return <div className="p-6 lg:p-8"><LoadingState /></div>;

  if (client === 'missing') {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="font-serif text-xl font-bold text-stone-900">კლიენტი ვერ მოიძებნა</h1>
        <button type="button" onClick={() => navigate('admin/clients')} className={`${secondaryButton} mt-4`}>
          კლიენტების სიაში დაბრუნება
        </button>
      </div>
    );
  }

  const totalBilled = orders.reduce((sum, o) => sum + o.total, 0);
  const totalPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <PageHeader
        back={{ label: 'კლიენტები', onClick: () => navigate('admin/clients') }}
        title={client.displayName}
        subtitle={[client.companyName, client.phone, client.email].filter(Boolean).join(' · ') || undefined}
        action={
          <div className="flex flex-wrap gap-2">
            {client.email && can('emails.send') && (
              <button type="button" onClick={() => setEmailOpen(true)} className={`${secondaryButton} inline-flex items-center gap-1.5`}>
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                წერილის გაგზავნა
              </button>
            )}
            {can('events.manage') && (
              <button type="button" onClick={() => navigate('admin/events')} className={`${secondaryButton} inline-flex items-center gap-1.5`}>
                <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                ღონისძიება
              </button>
            )}
            {can('orders.create') && (
              <button type="button" onClick={() => navigate('admin/orders')} className={`${primaryButton} inline-flex items-center gap-1.5`}>
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                შეკვეთა
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <StatTile label="სულ დარიცხული" value={formatGel(totalBilled)} />
        <StatTile label="გადახდილი" value={formatGel(totalPaid)} tone="positive" />
        <StatTile
          label="დარჩენილი"
          value={formatGel(outstanding)}
          tone={outstanding > 0 ? 'danger' : 'positive'}
          hint={outstanding > 0 ? 'გადასახდელი' : 'დავალიანება არ არის'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card padded={false}>
            <div className="px-5 pt-5">
              <CardHeader title="შეკვეთები" subtitle={`${orders.length} შეკვეთა`} />
            </div>
            {orders.length === 0 ? (
              <EmptyState title="შეკვეთა ჯერ არ არის" />
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead className="sr-only">
                  <tr><th scope="col">ნომერი</th><th scope="col">სტატუსი</th><th scope="col">თანხა</th></tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => navigate('admin/orders/:id', { id: order.id })}
                      className="border-t border-stone-100 hover:bg-stone-50/60 cursor-pointer"
                    >
                      <td className="px-5 py-3 font-mono font-medium text-stone-900">{order.orderNumber}</td>
                      <td className="px-5 py-3">
                        <Pill className={ORDER_STATUS_TONE[order.orderStatus]}>{ORDER_STATUS_LABELS[order.orderStatus]}</Pill>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <span className="font-semibold text-stone-900">{formatGel(order.total)}</span>
                        <Pill className={`ml-2 ${PAYMENT_STATUS_TONE[order.paymentStatus]}`}>
                          {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card padded={false}>
            <div className="px-5 pt-5">
              <CardHeader title="ღონისძიებები" subtitle={`${events.length} ღონისძიება`} />
            </div>
            {events.length === 0 ? (
              <EmptyState title="ღონისძიება ჯერ არ არის" hint="ღონისძიებაში აირჩევთ სტუმრების წიგნს, ალბომს ან ორივეს." />
            ) : (
              <ul className="divide-y divide-stone-100">
                {events.map((event) => (
                  <li key={event.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-stone-900">{event.title}</p>
                        <p className="text-[11px] text-stone-600">{formatDateShort(event.eventDate)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {event.hasGuestbook && (
                          <a href={publicGuestBookUrl(event.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-800 hover:bg-rose-100">
                            <BookHeart className="w-3 h-3" aria-hidden="true" />
                            წიგნი
                          </a>
                        )}
                        {event.hasAlbum && (
                          <a href={publicAlbumUrl(event.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100">
                            <Images className="w-3 h-3" aria-hidden="true" />
                            ალბომი
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padded={false}>
            <div className="px-5 pt-5">
              <CardHeader title="გადახდები" subtitle={`${payments.length} ჩანაწერი`} />
            </div>
            {payments.length === 0 ? (
              <EmptyState title="გადახდა ჯერ არ დაფიქსირებულა" />
            ) : (
              <ul className="divide-y divide-stone-100">
                {payments.slice(0, 12).map((payment) => (
                  <li key={payment.id} className="px-5 py-2.5 flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-stone-700">
                      <Wallet className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5 text-stone-500" aria-hidden="true" />
                      {formatDateShort(payment.paidAt)} · {PAYMENT_METHOD_LABELS[payment.method]}
                    </span>
                    <span className="font-semibold text-emerald-800">{formatGel(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader
              title="შესვლის ანგარიშები"
              subtitle={users.length === 0 ? 'ჯერ არ არის' : `${users.length} ანგარიში`}
              action={
                can('users.manage') ? (
                  <button type="button" onClick={openUserForm} className={`${secondaryButton} inline-flex items-center gap-1.5 !py-1.5 !px-3`}>
                    <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                    შექმნა
                  </button>
                ) : undefined
              }
            />

            {users.length === 0 ? (
              <p className="text-[13px] text-stone-600 leading-relaxed">
                კლიენტს შესვლის ანგარიში არ სჭირდება, თუ მხოლოდ ჩვეულებრივი შეკვეთა აქვს.
                ანგარიში მაშინ გახდება საჭირო, როცა სტუმრების წიგნს ან ალბომს მიიღებს.
              </p>
            ) : (
              <ul className="space-y-2">
                {users.map((account) => (
                  <li key={account.id} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[13px] font-medium text-stone-900 truncate">{account.username}</p>
                        <p className="text-[11px] text-stone-600">
                          {USER_STATUS_LABELS[account.status]}
                          {account.mustChangePassword && ' · პაროლი შესაცვლელია'}
                        </p>
                      </div>
                      {can('users.manage') && (
                        <button
                          type="button"
                          onClick={() => resetPassword(account)}
                          aria-label={`${account.username} — პაროლის შეცვლა`}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {([
                        ['guestbook', 'წიგნი'],
                        ['album', 'ალბომი'],
                        ['orders', 'შეკვეთები'],
                        ['payments', 'გადახდები'],
                      ] as [keyof typeof account.access, string][])
                        .filter(([key]) => account.access[key])
                        .map(([key, label]) => (
                          <Pill key={key} className="bg-white text-stone-700 border-stone-300">{label}</Pill>
                        ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="კონტაქტი" />
            <dl className="space-y-2 text-[13px]">
              {[
                ['ტელეფონი', client.phone],
                ['დამატებითი', client.secondaryPhone],
                ['ელფოსტა', client.email],
                ['მისამართი', client.address],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 py-1 border-b border-stone-100 last:border-0">
                    <dt className="text-stone-600 shrink-0">{label}</dt>
                    <dd className="text-stone-900 text-right break-all">{value}</dd>
                  </div>
                ))}
            </dl>
            {!client.phone && !client.email && (
              <p className="text-[13px] text-stone-600">საკონტაქტო მონაცემები არ არის შევსებული.</p>
            )}
          </Card>

          {client.notes && (
            <Card>
              <CardHeader title="შიდა შენიშვნა" />
              <p className="text-[13px] text-stone-700 leading-relaxed whitespace-pre-line">{client.notes}</p>
            </Card>
          )}
        </aside>
      </div>

      {/* Create a login for this client ------------------------------- */}
      <Modal
        isOpen={userOpen}
        title="შესვლის ანგარიშის შექმნა"
        onClose={() => setUserOpen(false)}
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setUserOpen(false)} disabled={saving}>
              გაუქმება
            </button>
            <button type="button" className={primaryButton} onClick={createUser} disabled={saving}>
              {saving ? 'იქმნება...' : 'შექმნა'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-[13px] font-medium text-rose-800">
              {formError}
            </div>
          )}

          <Field id="cd-username" label="მომხმარებელი" required hint="ლათინურად. ასე შედის კლიენტი სისტემაში.">
            {(d) => (
              <input id="cd-username" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" spellCheck={false} aria-describedby={d} className={inputClass} />
            )}
          </Field>

          <Field id="cd-password" label="დროებითი პაროლი" required hint="ერთხელ გამოჩნდება. პირველ შესვლაზე შეცვლა მოეთხოვება.">
            {(d) => (
              <div className="flex gap-2">
                <input id="cd-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={d} className={`${inputClass} font-mono`} />
                <button type="button" onClick={() => setPassword(generateTemporaryPassword())} className={secondaryButton}>
                  ახალი
                </button>
              </div>
            )}
          </Field>

          <fieldset className="rounded-xl border border-stone-200 p-4">
            <legend className="px-1.5 text-[13px] font-semibold text-stone-800">რას ნახავს</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ['guestbook', 'სტუმრების წიგნი'],
                ['album', 'ციფრული ალბომი'],
                ['orders', 'შეკვეთები'],
                ['payments', 'გადახდები'],
              ] as [keyof typeof access, string][]).map(([key, label]) => (
                <label key={key} htmlFor={`cd-access-${key}`} className="flex items-center gap-2 text-[13px] text-stone-800 cursor-pointer">
                  <input
                    id={`cd-access-${key}`}
                    type="checkbox"
                    checked={access[key]}
                    onChange={(e) => setAccess((p) => ({ ...p, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-stone-400 text-stone-900 cursor-pointer"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Modal>

      <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />

      <QuickEmailModal
        isOpen={emailOpen}
        onClose={() => setEmailOpen(false)}
        client={client}
        orders={orders}
        events={events}
        onSent={load}
      />
    </div>
  );
};

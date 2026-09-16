import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search, Trash2, Wallet } from 'lucide-react';
import type { Client, Order, Payment, PaymentMethod } from '../../domain/models.ts';
import { PAYMENT_METHODS } from '../../domain/models.ts';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONE } from '../../domain/labels.ts';
import { orderService, paymentService } from '../../services/orderService.ts';
import { clientService } from '../../services/clientService.ts';
import { activityService } from '../../services/systemService.ts';
import { formatGel, parseLariInput } from '../../domain/money.ts';
import { formatDateShort, toDateInputValue } from '../../domain/dates.ts';
import { downloadBlob } from '../../lib/download.ts';
import { useSession } from '../../lib/session.tsx';
import { navigate } from '../../lib/routes.ts';
import { Card, PageHeader, Pill, StatTile } from '../../components/ui/Card.tsx';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { Modal, primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

type Period = 'ALL' | 'TODAY' | 'MONTH';

/**
 * Every payment across every order, which is the view you want when the
 * question is "what came in", rather than "what does this one customer owe".
 */
export const PaymentsPage: React.FC = () => {
  const { user, can } = useSession();
  const toast = useToast();

  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [method, setMethod] = useState<PaymentMethod | 'ALL'>('ALL');
  const [period, setPeriod] = useState<Period>('ALL');

  const [addOpen, setAddOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [paidAt, setPaidAt] = useState(toDateInputValue(new Date()));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [removing, setRemoving] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [paymentList, orderList, clientList] = await Promise.all([
        paymentService.listAll(),
        orderService.list(),
        clientService.list(),
      ]);
      setPayments(paymentList);
      setOrders(orderList);
      setClients(clientList);
    } catch (err) {
      console.error('payments load failed', err);
      setError('გადახდების ჩატვირთვა ვერ მოხერხდა');
      setPayments([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const orderOf = (payment: Payment) => orders.find((o) => o.id === payment.orderId);
  const clientOf = (payment: Payment) => clients.find((c) => c.id === payment.clientId);

  const visible = useMemo(() => {
    const today = toDateInputValue(new Date());
    const month = today.slice(0, 7);

    return (payments || [])
      .filter((p) => method === 'ALL' || p.method === method)
      .filter((p) => {
        if (period === 'TODAY') return p.paidAt.slice(0, 10) === today;
        if (period === 'MONTH') return p.paidAt.slice(0, 7) === month;
        return true;
      })
      .filter((p) => {
        const needle = search.trim().toLowerCase();
        if (!needle) return true;
        const order = orderOf(p);
        const client = clientOf(p);
        return (
          (order?.orderNumber || '').toLowerCase().includes(needle) ||
          (client?.displayName || '').toLowerCase().includes(needle) ||
          (p.note || '').toLowerCase().includes(needle)
        );
      });
  }, [payments, orders, clients, method, period, search]);

  const totals = useMemo(() => {
    const today = toDateInputValue(new Date());
    const month = today.slice(0, 7);
    const all = payments || [];

    return {
      shown: visible.reduce((sum, p) => sum + p.amount, 0),
      today: all.filter((p) => p.paidAt.slice(0, 10) === today).reduce((sum, p) => sum + p.amount, 0),
      month: all.filter((p) => p.paidAt.slice(0, 7) === month).reduce((sum, p) => sum + p.amount, 0),
      outstanding: orders.reduce((sum, o) => sum + Math.max(0, o.balance), 0),
    };
  }, [visible, payments, orders]);

  const unpaidOrders = orders.filter((o) => o.balance > 0);

  const addPayment = async () => {
    const order = orders.find((o) => o.id === orderId);
    const value = parseLariInput(amount);

    if (!order) {
      setFormError('აირჩიეთ შეკვეთა');
      return;
    }
    if (value === null || value <= 0) {
      setFormError('შეიყვანეთ თანხა, მაგალითად 50 ან 50.50');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await paymentService.record(
        { orderId: order.id, clientId: order.clientId, amount: value, method: payMethod, paidAt, note },
        user?.id || ''
      );
      void activityService.record({
        actorUserId: user?.id || '',
        actorName: `${user?.firstName} ${user?.lastName}`.trim() || user?.username || '',
        action: 'payment.added',
        entityType: 'order',
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber, amount: value, method: payMethod },
      });
      toast.success('გადახდა დაფიქსირდა');
      setAddOpen(false);
      setAmount('');
      setNote('');
      await load();
    } catch (err) {
      console.error('payment failed', err);
      setFormError('შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await paymentService.remove(removing);
      void activityService.record({
        actorUserId: user?.id || '',
        actorName: `${user?.firstName} ${user?.lastName}`.trim() || user?.username || '',
        action: 'payment.removed',
        entityType: 'order',
        entityId: removing.orderId,
        metadata: { amount: removing.amount },
      });
      toast.success('გადახდა წაიშალა და ბალანსი დაბრუნდა');
      setRemoving(null);
      await load();
    } catch (err) {
      console.error('payment removal failed', err);
      toast.error('წაშლა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const quote = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['თარიღი', 'შეკვეთა', 'კლიენტი', 'მეთოდი', 'თანხა', 'შენიშვნა'];
    const rows = visible.map((p) =>
      [
        formatDateShort(p.paidAt),
        orderOf(p)?.orderNumber || '',
        clientOf(p)?.displayName || '',
        PAYMENT_METHOD_LABELS[p.method],
        (p.amount / 100).toFixed(2),
        p.note || '',
      ]
        .map(quote)
        .join(',')
    );
    // A BOM keeps Georgian readable when the file is opened in Excel.
    const csv = '﻿' + [headers.map(quote).join(','), ...rows].join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `payments-${Date.now()}.csv`);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="გადახდები"
        subtitle={payments === null ? 'იტვირთება...' : `${payments.length} ჩანაწერი`}
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportCsv} disabled={!visible.length} className={`${secondaryButton} inline-flex items-center gap-1.5`}>
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              CSV
            </button>
            {can('payments.edit') && (
              <button
                type="button"
                onClick={() => {
                  setOrderId(unpaidOrders[0]?.id || orders[0]?.id || '');
                  setPaidAt(toDateInputValue(new Date()));
                  setFormError(null);
                  setAddOpen(true);
                }}
                disabled={orders.length === 0}
                className={`${primaryButton} inline-flex items-center gap-1.5`}
              >
                <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
                გადახდის დამატება
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        <StatTile label="დღეს" value={formatGel(totals.today)} tone="positive" />
        <StatTile label="ამ თვეში" value={formatGel(totals.month)} tone="positive" />
        <StatTile label="ნაჩვენები" value={formatGel(totals.shown)} hint={`${visible.length} ჩანაწერი`} />
        <StatTile
          label="დარჩენილი ამოსაღები"
          value={formatGel(totals.outstanding)}
          tone={totals.outstanding > 0 ? 'danger' : 'positive'}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="შეკვეთა, კლიენტი, შენიშვნა"
            aria-label="გადახდების ძებნა"
            className={`${inputClass} pl-9`}
          />
        </div>

        <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | 'ALL')} aria-label="მეთოდით ფილტრი" className={`${inputClass} w-auto`}>
          <option value="ALL">ყველა მეთოდი</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
        </select>

        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="პერიოდით ფილტრი" className={`${inputClass} w-auto`}>
          <option value="ALL">მთელი პერიოდი</option>
          <option value="TODAY">დღეს</option>
          <option value="MONTH">ამ თვეში</option>
        </select>
      </div>

      <Card padded={false} className="overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : payments === null ? (
          <LoadingState />
        ) : visible.length === 0 ? (
          <EmptyState
            title={payments.length === 0 ? 'გადახდა ჯერ არ დაფიქსირებულა' : 'ვერაფერი მოიძებნა'}
            hint={
              orders.length === 0
                ? 'ჯერ შეკვეთა შექმენით — გადახდა ყოველთვის შეკვეთას ებმის.'
                : payments.length === 0
                  ? 'დაამატეთ პირველი გადახდა ღილაკით ზემოთ.'
                  : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">თარიღი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">შეკვეთა</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">კლიენტი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">მეთოდი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700 text-right">თანხა</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700"><span className="sr-only">მოქმედება</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((payment) => {
                  const order = orderOf(payment);
                  return (
                    <tr key={payment.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                      <td className="px-4 py-3 text-stone-700 whitespace-nowrap">{formatDateShort(payment.paidAt)}</td>
                      <td className="px-4 py-3">
                        {order ? (
                          <button
                            type="button"
                            onClick={() => navigate('admin/orders/:id', { id: order.id })}
                            className="font-mono font-medium text-stone-900 hover:underline cursor-pointer"
                          >
                            {order.orderNumber}
                          </button>
                        ) : (
                          <span className="text-stone-500">—</span>
                        )}
                        {order && (
                          <Pill className={`ml-2 ${PAYMENT_STATUS_TONE[order.paymentStatus]}`}>
                            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                          </Pill>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-800">{clientOf(payment)?.displayName || '—'}</td>
                      <td className="px-4 py-3 text-stone-700">
                        {PAYMENT_METHOD_LABELS[payment.method]}
                        {payment.note && <span className="block text-[11px] text-stone-600">{payment.note}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-800 whitespace-nowrap">
                        {formatGel(payment.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {can('payments.edit') && (
                          <button
                            type="button"
                            onClick={() => setRemoving(payment)}
                            aria-label={`${formatGel(payment.amount)} — წაშლა`}
                            className="p-1.5 rounded-lg text-stone-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={addOpen}
        title="გადახდის დამატება"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setAddOpen(false)} disabled={saving}>
              გაუქმება
            </button>
            <button type="button" className={primaryButton} onClick={addPayment} disabled={saving}>
              {saving ? 'ინახება...' : 'დაფიქსირება'}
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

          <Field id="pp-order" label="შეკვეთა" required hint="ჯერ გადაუხდელები ჩანს.">
            {(d) => (
              <select id="pp-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} aria-describedby={d} className={inputClass}>
                {unpaidOrders.length > 0 && (
                  <optgroup label="გადასახდელი">
                    {unpaidOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} — {o.customerName} — დარჩენილი {formatGel(o.balance)}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="ყველა შეკვეთა">
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>{o.orderNumber} — {o.customerName}</option>
                  ))}
                </optgroup>
              </select>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pp-amount" label="თანხა (₾)" required>
              {() => <input id="pp-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />}
            </Field>
            <Field id="pp-method" label="მეთოდი" required>
              {() => (
                <select id="pp-method" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} className={inputClass}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                </select>
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pp-date" label="თარიღი">
              {() => <input id="pp-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputClass} />}
            </Field>
            <Field id="pp-note" label="შენიშვნა">
              {() => <input id="pp-note" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />}
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={removing !== null}
        title="გადახდის წაშლა"
        message={`${removing ? formatGel(removing.amount) : ''} წაიშლება და შესაბამისი შეკვეთის ბალანსი გაიზრდება.`}
        confirmLabel="წაშლა"
        busy={busy}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
};

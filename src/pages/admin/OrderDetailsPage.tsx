import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { Order, Payment, PaymentMethod } from '../../domain/models.ts';
import { PAYMENT_METHODS, ORDER_STATUSES } from '../../domain/models.ts';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONE,
} from '../../domain/labels.ts';
import { formatGel, parseLariInput } from '../../domain/money.ts';
import { formatDateShort, formatDateTime, toDateInputValue } from '../../domain/dates.ts';
import { orderService, paymentService } from '../../services/orderService.ts';
import { useSession } from '../../lib/session.tsx';
import { navigate } from '../../lib/routes.ts';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { Modal, primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { ErrorState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

export const OrderDetailsPage: React.FC<{ orderId: string }> = ({ orderId }) => {
  const { user, can } = useSession();
  const toast = useToast();

  const [order, setOrder] = useState<Order | null | 'missing'>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [paidAt, setPaidAt] = useState(toDateInputValue(new Date()));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [removing, setRemoving] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const found = await orderService.get(orderId);
      if (!found) {
        setOrder('missing');
        return;
      }
      setOrder(found);
      setPayments(await paymentService.listForOrder(orderId));
    } catch (err) {
      console.error('order load failed', err);
      setError('შეკვეთის ჩატვირთვა ვერ მოხერხდა');
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePay = async () => {
    if (order === null || order === 'missing') return;

    const value = parseLariInput(amount);
    if (value === null || value <= 0) {
      setFormError('შეიყვანეთ თანხა, მაგალითად 50 ან 50.50');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await paymentService.record(
        { orderId: order.id, clientId: order.clientId, amount: value, method, paidAt: paidAt || undefined, note },
        user?.id || ''
      );
      toast.success('გადახდა დაფიქსირდა');
      setPayOpen(false);
      setAmount('');
      setNote('');
      await load();
    } catch (err) {
      console.error('payment failed', err);
      setFormError('გადახდის შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePayment = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await paymentService.remove(removing);
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

  if (error) return <div className="p-6 lg:p-8"><ErrorState message={error} onRetry={load} /></div>;
  if (order === null) return <div className="p-6 lg:p-8"><LoadingState /></div>;

  if (order === 'missing') {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-xl font-semibold text-stone-900">შეკვეთა ვერ მოიძებნა</h1>
        <button type="button" onClick={() => navigate('admin/orders')} className={`${secondaryButton} mt-4`}>
          შეკვეთების სიაში დაბრუნება
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <button
        type="button"
        onClick={() => navigate('admin/orders')}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-700 hover:text-stone-900 cursor-pointer mb-4"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        შეკვეთები
      </button>

      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 font-mono">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-stone-600">
            {order.customerName}
            {order.deadline && ` · დედლაინი ${formatDateShort(order.deadline)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${ORDER_STATUS_TONE[order.orderStatus]}`}>
            {ORDER_STATUS_LABELS[order.orderStatus]}
          </span>
          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${PAYMENT_STATUS_TONE[order.paymentStatus]}`}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </span>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <section className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <h2 className="px-4 py-3 border-b border-stone-200 bg-stone-50 text-sm font-semibold text-stone-900">
              პოზიციები
            </h2>
            <table className="w-full text-left text-[13px]">
              <thead className="sr-only">
                <tr><th scope="col">დასახელება</th><th scope="col">რაოდენობა</th><th scope="col">ჯამი</th></tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-2.5 text-stone-900">{item.name}</td>
                    <td className="px-4 py-2.5 text-stone-600 whitespace-nowrap">
                      {item.quantity} × {formatGel(item.unitPrice)}
                      {item.discount > 0 && <span className="block text-[11px]">− {formatGel(item.discount)}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-stone-900 whitespace-nowrap">
                      {formatGel(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-200 bg-stone-50">
              <h2 className="text-sm font-semibold text-stone-900">გადახდები</h2>
              {can('payments.edit') && (
                <button
                  type="button"
                  onClick={() => { setFormError(null); setPayOpen(true); }}
                  className={`${secondaryButton} inline-flex items-center gap-1.5 !py-1.5`}
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  დამატება
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-stone-600">გადახდა ჯერ არ დაფიქსირებულა.</p>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead className="sr-only">
                  <tr><th scope="col">თარიღი</th><th scope="col">მეთოდი</th><th scope="col">თანხა</th><th scope="col">მოქმედება</th></tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-2.5 text-stone-700 whitespace-nowrap">{formatDateShort(payment.paidAt)}</td>
                      <td className="px-4 py-2.5 text-stone-700">
                        {PAYMENT_METHOD_LABELS[payment.method]}
                        {payment.note && <span className="block text-[11px] text-stone-600">{payment.note}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-800 whitespace-nowrap">
                        {formatGel(payment.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {can('payments.edit') && (
                          <button
                            type="button"
                            onClick={() => setRemoving(payment)}
                            aria-label={`${formatGel(payment.amount)} — გადახდის წაშლა`}
                            className="p-1.5 rounded-lg text-stone-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="bg-white border border-stone-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-stone-900 mb-3">ფინანსები</h2>
            <dl className="space-y-2 text-[13px]">
              {[
                ['ჯამი', formatGel(order.subtotal), ''],
                ['ფასდაკლება', `− ${formatGel(order.discount)}`, ''],
                ['სრული ფასი', formatGel(order.total), 'font-semibold text-stone-900'],
                ['გადახდილი', formatGel(order.paidAmount), 'text-emerald-800'],
                ['დარჩენილი', formatGel(order.balance), order.balance > 0 ? 'font-bold text-rose-700' : 'font-bold text-emerald-800'],
              ].map(([label, value, tone]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-1 border-b border-stone-100 last:border-0">
                  <dt className="text-stone-700">{label}</dt>
                  <dd className={tone || 'text-stone-800'}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {can('orders.edit') && (
            <section className="bg-white border border-stone-200 rounded-xl p-4">
              <label htmlFor="detail-status" className="block text-[13px] font-semibold text-stone-800 mb-2">
                სტატუსი
              </label>
              <select
                id="detail-status"
                value={order.orderStatus}
                onChange={async (e) => {
                  await orderService.setStatus(order.id, e.target.value as Order['orderStatus']);
                  toast.success('სტატუსი განახლდა');
                  await load();
                }}
                className={inputClass}
              >
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
              </select>
            </section>
          )}

          {order.internalNotes && (
            <section className="bg-white border border-stone-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-stone-900 mb-2">შიდა შენიშვნა</h2>
              <p className="text-[13px] text-stone-700 leading-relaxed whitespace-pre-line">{order.internalNotes}</p>
            </section>
          )}

          <p className="text-[11px] text-stone-600">შექმნილია {formatDateTime(order.createdAt)}</p>
        </aside>
      </div>

      <Modal
        isOpen={payOpen}
        title="გადახდის დამატება"
        onClose={() => setPayOpen(false)}
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setPayOpen(false)} disabled={saving}>
              გაუქმება
            </button>
            <button type="button" className={primaryButton} onClick={handlePay} disabled={saving}>
              {saving ? 'ინახება...' : 'დაფიქსირება'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-[13px] font-medium text-rose-800">
              {formError}
            </div>
          )}

          <p className="text-[13px] text-stone-700">
            დარჩენილი გადასახდელი: <strong className="font-semibold">{formatGel(order.balance)}</strong>
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pay-amount" label="თანხა (₾)" required>
              {() => <input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} autoFocus />}
            </Field>
            <Field id="pay-method" label="მეთოდი" required>
              {() => (
                <select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputClass}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                </select>
              )}
            </Field>
          </div>

          <Field id="pay-date" label="გადახდის თარიღი">
            {() => <input id="pay-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputClass} />}
          </Field>

          <Field id="pay-note" label="შენიშვნა">
            {() => <input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />}
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={removing !== null}
        title="გადახდის წაშლა"
        message={`${removing ? formatGel(removing.amount) : ''} წაიშლება და შეკვეთის ბალანსი შესაბამისად გაიზრდება.`}
        confirmLabel="წაშლა"
        busy={busy}
        onConfirm={handleRemovePayment}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
};

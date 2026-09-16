import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, Plus, Search, Trash2 } from 'lucide-react';
import type { CatalogItem, Client, Order, OrderItem, OrderStatus } from '../../domain/models.ts';
import { ORDER_STATUSES } from '../../domain/models.ts';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONE,
} from '../../domain/labels.ts';
import { calculateOrderTotals, isOverdue } from '../../domain/orders.ts';
import { formatGel, parseLariInput } from '../../domain/money.ts';
import { formatDateShort, toDateInputValue } from '../../domain/dates.ts';
import { orderService } from '../../services/orderService.ts';
import { clientService } from '../../services/clientService.ts';
import { catalogService } from '../../services/catalogService.ts';
import { activityService } from '../../services/systemService.ts';
import { matchesSearch, newId } from '../../services/firestoreHelpers.ts';
import { useSession } from '../../lib/session.tsx';
import { navigate } from '../../lib/routes.ts';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { Modal, primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/DataState.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

interface DraftItem {
  id: string;
  catalogItemId: string | null;
  name: string;
  quantity: string;
  unitPrice: string;
  discount: string;
}

const blankItem = (): DraftItem => ({
  id: newId('li'),
  catalogItemId: null,
  name: '',
  quantity: '1',
  unitPrice: '',
  discount: '',
});

/** Turn the text a person typed into the integer tetri the model stores. */
function toOrderItems(drafts: DraftItem[]): OrderItem[] {
  return drafts
    .filter((d) => d.name.trim())
    .map((d) => ({
      id: d.id,
      catalogItemId: d.catalogItemId,
      name: d.name.trim(),
      quantity: Math.max(1, Number(d.quantity) || 1),
      unitPrice: parseLariInput(d.unitPrice) ?? 0,
      discount: parseLariInput(d.discount) ?? 0,
      lineTotal: 0,
    }));
}

export const OrdersPage: React.FC = () => {
  const { user, can, isSuperAdmin } = useSession();
  const toast = useToast();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [orderDiscount, setOrderDiscount] = useState('');
  const [drafts, setDrafts] = useState<DraftItem[]>([blankItem()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [removing, setRemoving] = useState<{ order: Order; permanent: boolean } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [orderList, clientList, itemList] = await Promise.all([
        orderService.list(),
        clientService.list(),
        catalogService.listItems(),
      ]);
      setOrders(orderList);
      setClients(clientList);
      setItems(itemList);
    } catch (err) {
      console.error('orders load failed', err);
      setError('შეკვეთების ჩატვირთვა ვერ მოხერხდა');
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () =>
      (orders || [])
        .filter((o) => statusFilter === 'ALL' || o.orderStatus === statusFilter)
        .filter((o) => !onlyOverdue || isOverdue(o))
        .filter((o) => matchesSearch(o, ['orderNumber', 'customerName', 'phone'], search)),
    [orders, statusFilter, onlyOverdue, search]
  );

  /** The same figures the order will be saved with, shown while it is typed. */
  const preview = useMemo(
    () => calculateOrderTotals(toOrderItems(drafts), parseLariInput(orderDiscount) ?? 0, 0),
    [drafts, orderDiscount]
  );

  const openCreate = () => {
    setClientId(clients[0]?.id || '');
    setDeadline('');
    setNotes('');
    setOrderDiscount('');
    setDrafts([blankItem()]);
    setFormError(null);
    setFormOpen(true);
  };

  const pickCatalogItem = (draftId: string, catalogItemId: string) => {
    const found = items.find((i) => i.id === catalogItemId);
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? found
            ? { ...d, catalogItemId, name: found.name, unitPrice: String(found.price / 100) }
            : { ...d, catalogItemId: null }
          : d
      )
    );

    // A catalogue item that states its production time suggests the deadline.
    if (found?.productionDays && !deadline) {
      const due = new Date();
      due.setDate(due.getDate() + found.productionDays);
      setDeadline(toDateInputValue(due));
    }
  };

  const handleSave = async () => {
    const orderItems = toOrderItems(drafts);
    const client = clients.find((c) => c.id === clientId);

    if (!client) {
      setFormError('აირჩიეთ კლიენტი');
      return;
    }
    if (orderItems.length === 0) {
      setFormError('დაამატეთ მინიმუმ ერთი პოზიცია');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const created = await orderService.create(
        {
          clientId,
          customerName: client.displayName,
          phone: client.phone,
          email: client.email,
          items: orderItems,
          discount: parseLariInput(orderDiscount) ?? 0,
          deadline: deadline || null,
          internalNotes: notes.trim() || undefined,
        },
        user?.id || ''
      );

      void activityService.record({
        actorUserId: user?.id || '',
        actorName: `${user?.firstName} ${user?.lastName}`.trim() || user?.username || '',
        action: 'order.created',
        entityType: 'order',
        entityId: created.id,
        metadata: { orderNumber: created.orderNumber, total: created.total },
      });

      toast.success('შეკვეთა შეიქმნა');
      setFormOpen(false);
      await load();
    } catch (err) {
      console.error('order save failed', err);
      setFormError('შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (order: Order, status: OrderStatus) => {
    try {
      await orderService.setStatus(order.id, status);
      void activityService.record({
        actorUserId: user?.id || '',
        actorName: `${user?.firstName} ${user?.lastName}`.trim() || user?.username || '',
        action: 'order.status_changed',
        entityType: 'order',
        entityId: order.id,
        metadata: { orderNumber: order.orderNumber, status },
      });
      toast.success(`სტატუსი: ${ORDER_STATUS_LABELS[status]}`);
      await load();
    } catch (err) {
      console.error('status change failed', err);
      toast.error('სტატუსის შეცვლა ვერ მოხერხდა');
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      if (removing.permanent) {
        await orderService.destroy(removing.order.id);
      } else {
        await orderService.archive(removing.order.id);
      }

      void activityService.record({
        actorUserId: user?.id || '',
        actorName: `${user?.firstName} ${user?.lastName}`.trim() || user?.username || '',
        action: removing.permanent ? 'order.deleted' : 'order.archived',
        entityType: 'order',
        entityId: removing.order.id,
        metadata: { orderNumber: removing.order.orderNumber },
      });

      toast.success(removing.permanent ? 'შეკვეთა წაიშალა' : 'შეკვეთა დაარქივდა');
      setRemoving(null);
      await load();
    } catch (err) {
      console.error('order removal failed', err);
      toast.error('ოპერაცია ვერ შესრულდა');
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">შეკვეთები</h1>
          <p className="mt-1 text-sm text-stone-600">
            {orders === null ? 'იტვირთება...' : `${orders.length} შეკვეთა`}
          </p>
        </div>
        {can('orders.create') && (
          <button type="button" onClick={openCreate} disabled={clients.length === 0} className={`${primaryButton} inline-flex items-center gap-2`}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            ახალი შეკვეთა
          </button>
        )}
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ნომერი, კლიენტი, ტელეფონი"
            aria-label="შეკვეთების ძებნა"
            className={`${inputClass} pl-9`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
          aria-label="სტატუსით ფილტრი"
          className={`${inputClass} w-auto`}
        >
          <option value="ALL">ყველა სტატუსი</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>

        <label htmlFor="only-overdue" className="flex items-center gap-2 text-[13px] text-stone-800 cursor-pointer px-2">
          <input
            id="only-overdue"
            type="checkbox"
            checked={onlyOverdue}
            onChange={(e) => setOnlyOverdue(e.target.checked)}
            className="w-4 h-4 rounded border-stone-400 text-stone-900 cursor-pointer"
          />
          ვადაგადაცილებული
        </label>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : orders === null ? (
          <LoadingState />
        ) : visible.length === 0 ? (
          <EmptyState
            title={orders.length === 0 ? 'შეკვეთა ჯერ არ არის' : 'ვერაფერი მოიძებნა'}
            hint={
              clients.length === 0
                ? 'ჯერ დაამატეთ კლიენტი.'
                : items.length === 0
                  ? 'დაამატეთ პროდუქტი კატალოგში, რომ შეკვეთაში აირჩიოთ.'
                  : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">ნომერი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">კლიენტი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">თანხა</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">გადახდა</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">სტატუსი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">დედლაინი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700 text-right">
                    <span className="sr-only">მოქმედება</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => {
                  const overdue = isOverdue(order);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate('admin/orders/:id', { id: order.id })}
                      className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-stone-900 whitespace-nowrap">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-stone-800">{order.customerName}</td>
                      <td className="px-4 py-3 font-semibold text-stone-900 whitespace-nowrap">
                        {formatGel(order.total)}
                        {order.balance > 0 && (
                          <span className="block text-[11px] font-normal text-rose-700">
                            დარჩენილი {formatGel(order.balance)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${PAYMENT_STATUS_TONE[order.paymentStatus]}`}>
                          {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {can('orders.edit') ? (
                          <select
                            value={order.orderStatus}
                            onChange={(e) => changeStatus(order, e.target.value as OrderStatus)}
                            aria-label={`${order.orderNumber} — სტატუსი`}
                            className={`px-2 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${ORDER_STATUS_TONE[order.orderStatus]}`}
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${ORDER_STATUS_TONE[order.orderStatus]}`}>
                            {ORDER_STATUS_LABELS[order.orderStatus]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.deadline ? (
                          <span className={overdue ? 'inline-flex items-center gap-1 font-semibold text-rose-700' : 'text-stone-700'}>
                            {overdue && <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
                            {formatDateShort(order.deadline)}
                          </span>
                        ) : (
                          <span className="text-stone-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {can('orders.delete') && (
                            <button
                              type="button"
                              onClick={() => setRemoving({ order, permanent: false })}
                              aria-label={`${order.orderNumber} — დაარქივება`}
                              title="დაარქივება"
                              className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => setRemoving({ order, permanent: true })}
                              aria-label={`${order.orderNumber} — სამუდამოდ წაშლა`}
                              title="სამუდამოდ წაშლა"
                              className="p-1.5 rounded-lg text-stone-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={removing !== null}
        title={removing?.permanent ? 'შეკვეთის სამუდამოდ წაშლა' : 'შეკვეთის დაარქივება'}
        message={
          removing?.permanent
            ? `${removing.order.orderNumber} და მასზე დაფიქსირებული გადახდები სამუდამოდ წაიშლება. ეს ქმედება შეუქცევადია.`
            : `${removing?.order.orderNumber} სიიდან გაქრება, მაგრამ მონაცემები შენარჩუნდება და საჭიროებისას აღდგება.`
        }
        confirmLabel={removing?.permanent ? 'სამუდამოდ წაშლა' : 'დაარქივება'}
        busy={removeBusy}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />

      <Modal
        isOpen={formOpen}
        title="ახალი შეკვეთა"
        onClose={() => setFormOpen(false)}
        size="lg"
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setFormOpen(false)} disabled={saving}>
              გაუქმება
            </button>
            <button type="button" className={primaryButton} onClick={handleSave} disabled={saving}>
              {saving ? 'იქმნება...' : 'შეკვეთის შექმნა'}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="order-client" label="კლიენტი" required>
              {() => (
                <select id="order-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
                  <option value="">— აირჩიეთ —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                </select>
              )}
            </Field>
            <Field id="order-deadline" label="დედლაინი">
              {() => <input id="order-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />}
            </Field>
          </div>

          <fieldset className="rounded-lg border border-stone-200 p-4">
            <legend className="px-1.5 text-[13px] font-semibold text-stone-800">პოზიციები</legend>

            <div className="space-y-3">
              {drafts.map((draft, index) => (
                <div key={draft.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-stone-600">პოზიცია {index + 1}</span>
                    {drafts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDrafts((prev) => prev.filter((d) => d.id !== draft.id))}
                        aria-label={`პოზიცია ${index + 1} — წაშლა`}
                        className="p-1 text-stone-500 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <select
                      value={draft.catalogItemId || ''}
                      onChange={(e) => pickCatalogItem(draft.id, e.target.value)}
                      aria-label={`პოზიცია ${index + 1} — კატალოგიდან არჩევა`}
                      className={inputClass}
                    >
                      <option value="">— კატალოგიდან, ან ჩაწერეთ ხელით —</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>{i.name} — {formatGel(i.price)}</option>
                      ))}
                    </select>

                    <input
                      value={draft.name}
                      onChange={(e) => setDrafts((prev) => prev.map((d) => (d.id === draft.id ? { ...d, name: e.target.value, catalogItemId: null } : d)))}
                      aria-label={`პოზიცია ${index + 1} — დასახელება`}
                      placeholder="დასახელება"
                      className={inputClass}
                    />

                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ['quantity', 'რაოდენობა'],
                        ['unitPrice', 'ერთეულის ფასი ₾'],
                        ['discount', 'ფასდაკლება ₾'],
                      ] as [keyof DraftItem, string][]).map(([key, label]) => (
                        <input
                          key={key}
                          inputMode="decimal"
                          value={String(draft[key] ?? '')}
                          onChange={(e) => setDrafts((prev) => prev.map((d) => (d.id === draft.id ? { ...d, [key]: e.target.value } : d)))}
                          aria-label={`პოზიცია ${index + 1} — ${label}`}
                          placeholder={label}
                          className={inputClass}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => setDrafts((prev) => [...prev, blankItem()])} className={`${secondaryButton} mt-3 w-full`}>
              პოზიციის დამატება
            </button>
          </fieldset>

          <Field id="order-discount" label="ფასდაკლება მთელ შეკვეთაზე (₾)">
            {() => <input id="order-discount" inputMode="decimal" value={orderDiscount} onChange={(e) => setOrderDiscount(e.target.value)} className={inputClass} />}
          </Field>

          <dl className="rounded-lg border border-stone-300 bg-stone-50 divide-y divide-stone-200 text-[13px]">
            {[
              ['ჯამი', formatGel(preview.subtotal)],
              ['ფასდაკლება', `− ${formatGel(preview.discount)}`],
              ['გადასახდელი', formatGel(preview.total)],
            ].map(([label, value], i) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <dt className={i === 2 ? 'font-semibold text-stone-900' : 'text-stone-700'}>{label}</dt>
                <dd className={i === 2 ? 'font-bold text-stone-900' : 'text-stone-800'}>{value}</dd>
              </div>
            ))}
          </dl>

          <Field id="order-notes" label="შიდა შენიშვნა" hint="კლიენტი ამას ვერ ხედავს.">
            {(d) => <textarea id="order-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} aria-describedby={d} className={`${inputClass} resize-none`} />}
          </Field>
        </div>
      </Modal>
    </div>
  );
};

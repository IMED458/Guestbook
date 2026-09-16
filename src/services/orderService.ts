import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import type { Order, OrderItem, OrderStatus, Payment, PaymentMethod, Tetri } from '../domain/models.ts';
import { calculateOrderTotals, formatOrderNumber, withLineTotals } from '../domain/orders.ts';
import {
  byNewest,
  clean,
  createOne,
  deleteOne,
  getOne,
  listWhere,
  newId,
  nowIso,
  updateOne,
  where,
} from './firestoreHelpers.ts';

const ORDERS = 'orders';
const PAYMENTS = 'payments';
const SETTINGS = 'settings';

export interface OrderInput {
  clientId: string;
  customerName: string;
  phone?: string;
  email?: string;
  items: OrderItem[];
  discount: Tetri;
  deadline?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  internalNotes?: string;
  clientNotes?: string;
  deliveryMethod?: string;
  orderStatus?: OrderStatus;
  eventId?: string | null;
}

/**
 * Order numbers come from a counter held in one settings document and handed
 * out inside a transaction. Counting the existing orders instead would give
 * two people the same number the moment they save at the same time.
 */
async function nextOrderNumber(): Promise<string> {
  const ref = doc(db, SETTINGS, 'counters');
  const year = new Date().getFullYear();

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : {};
    const prefix = (data.orderNumberPrefix as string) || 'ORD';
    const sequences = (data.orderSequence as Record<string, number>) || {};
    const next = (sequences[String(year)] || 0) + 1;

    tx.set(
      ref,
      { orderNumberPrefix: prefix, orderSequence: { ...sequences, [String(year)]: next } },
      { merge: true }
    );

    return formatOrderNumber(prefix, year, next);
  });
}

export const orderService = {
  async list(): Promise<Order[]> {
    const all = await listWhere<Order>(ORDERS);
    return all.filter((o) => !o.deletedAt).sort(byNewest());
  },

  async listForClient(clientId: string): Promise<Order[]> {
    // The clientId filter is what makes this query readable under the rules,
    // not a nicety — filtering afterwards would be refused outright.
    const all = await listWhere<Order>(ORDERS, [where('clientId', '==', clientId)]);
    return all.filter((o) => !o.deletedAt).sort(byNewest());
  },

  async get(id: string): Promise<Order | null> {
    return getOne<Order>(ORDERS, id);
  },

  async create(input: OrderInput, actorId: string): Promise<Order> {
    const id = newId('ord');
    const now = nowIso();
    const items = withLineTotals(input.items);
    const totals = calculateOrderTotals(items, input.discount, 0);

    const record: Order = {
      id,
      orderNumber: await nextOrderNumber(),
      clientId: input.clientId,
      customerName: input.customerName.trim(),
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      paidAmount: 0,
      balance: totals.total,
      paymentStatus: 'UNPAID',
      orderStatus: input.orderStatus || 'NEW',
      deadline: input.deadline || null,
      assignedStaffId: input.assignedStaffId || null,
      assignedStaffName: input.assignedStaffName || null,
      internalNotes: input.internalNotes?.trim() || undefined,
      clientNotes: input.clientNotes?.trim() || undefined,
      deliveryMethod: input.deliveryMethod?.trim() || undefined,
      eventId: input.eventId || null,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      deletedAt: null,
    };

    const { id: _omit, ...data } = record;
    await createOne(ORDERS, id, data as unknown as Record<string, unknown>);
    return record;
  },

  async update(id: string, input: Partial<OrderInput>): Promise<void> {
    const patch: Record<string, unknown> = { ...input };

    // Any change to the lines or the discount re-derives every figure, so the
    // stored totals can never drift from the items they came from.
    if (input.items || input.discount !== undefined) {
      const current = await getOne<Order>(ORDERS, id);
      if (!current) throw new Error('შეკვეთა ვერ მოიძებნა');

      const items = withLineTotals(input.items || current.items);
      const totals = calculateOrderTotals(
        items,
        input.discount ?? current.discount,
        current.paidAmount
      );

      patch.items = items;
      patch.subtotal = totals.subtotal;
      patch.discount = totals.discount;
      patch.total = totals.total;
      patch.balance = totals.balance;
      patch.paymentStatus = totals.paymentStatus;
    }

    await updateOne(ORDERS, id, patch);
  },

  async setStatus(id: string, orderStatus: OrderStatus): Promise<void> {
    await updateOne(ORDERS, id, { orderStatus });
  },

  async archive(id: string): Promise<void> {
    await updateOne(ORDERS, id, { deletedAt: nowIso() });
  },

  async restore(id: string): Promise<void> {
    await updateOne(ORDERS, id, { deletedAt: null });
  },

  /**
   * Permanent removal, together with the payments recorded against it.
   * Leaving those behind would keep them in the payments totals while the
   * order they belong to no longer exists.
   */
  async destroy(id: string): Promise<void> {
    const payments = await listWhere<Payment>(PAYMENTS, [where('orderId', '==', id)]);
    await Promise.all(payments.map((p) => deleteOne(PAYMENTS, p.id)));
    await deleteOne(ORDERS, id);
  },

  async listArchived(): Promise<Order[]> {
    const all = await listWhere<Order>(ORDERS);
    return all.filter((o) => o.deletedAt).sort(byNewest());
  },
};

export const paymentService = {
  async listForOrder(orderId: string): Promise<Payment[]> {
    const all = await listWhere<Payment>(PAYMENTS, [where('orderId', '==', orderId)]);
    return all.sort(byNewest('paidAt'));
  },

  async listForClient(clientId: string): Promise<Payment[]> {
    const all = await listWhere<Payment>(PAYMENTS, [where('clientId', '==', clientId)]);
    return all.sort(byNewest('paidAt'));
  },

  async listAll(): Promise<Payment[]> {
    const all = await listWhere<Payment>(PAYMENTS);
    return all.sort(byNewest('paidAt'));
  },

  /**
   * Recording a payment and re-deriving the order's balance happen in one
   * transaction. Two payments landing together must not both read the same
   * stale total and leave the order short.
   */
  async record(
    input: { orderId: string; clientId: string; amount: Tetri; method: PaymentMethod; paidAt?: string; note?: string },
    actorId: string
  ): Promise<Payment> {
    const paymentId = newId('pay');
    const now = nowIso();

    const payment: Payment = {
      id: paymentId,
      orderId: input.orderId,
      clientId: input.clientId,
      amount: input.amount,
      method: input.method,
      paidAt: input.paidAt || now,
      note: input.note?.trim() || undefined,
      createdAt: now,
      createdBy: actorId,
    };

    await runTransaction(db, async (tx) => {
      const orderRef = doc(db, ORDERS, input.orderId);
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) throw new Error('შეკვეთა ვერ მოიძებნა');

      const order = orderSnap.data() as Order;
      const totals = calculateOrderTotals(
        order.items,
        order.discount,
        (order.paidAmount || 0) + input.amount
      );

      // Firestore rejects `undefined`; an absent note has to become null.
      // The helper does this for ordinary writes, but a transaction bypasses it.
      const { id: _omit, ...paymentData } = payment;
      tx.set(doc(db, PAYMENTS, paymentId), clean(paymentData as unknown as Record<string, unknown>));
      tx.update(orderRef, {
        paidAmount: totals.paidAmount,
        balance: totals.balance,
        paymentStatus: totals.paymentStatus,
        updatedAt: now,
      });
    });

    return payment;
  },

  /** Reversing a payment puts the order's balance back where it belongs. */
  async remove(payment: Payment): Promise<void> {
    await runTransaction(db, async (tx) => {
      const orderRef = doc(db, ORDERS, payment.orderId);
      const orderSnap = await tx.get(orderRef);

      if (orderSnap.exists()) {
        const order = orderSnap.data() as Order;
        const totals = calculateOrderTotals(
          order.items,
          order.discount,
          Math.max(0, (order.paidAmount || 0) - payment.amount)
        );
        tx.update(orderRef, {
          paidAmount: totals.paidAmount,
          balance: totals.balance,
          paymentStatus: totals.paymentStatus,
          updatedAt: nowIso(),
        });
      }

      tx.delete(doc(db, PAYMENTS, payment.id));
    });
  },
};

export async function readCounters(): Promise<{ prefix: string; sequences: Record<string, number> }> {
  const snap = await getDoc(doc(db, SETTINGS, 'counters'));
  const data = snap.exists() ? snap.data() : {};
  return {
    prefix: (data.orderNumberPrefix as string) || 'ORD',
    sequences: (data.orderSequence as Record<string, number>) || {},
  };
}

import type { Order, OrderItem, Payment, PaymentStatus, Tetri } from './models.ts';

/**
 * Every figure on an order is derived here and nowhere else. Two components
 * computing a balance with two slightly different formulas is the classic way
 * an order page and an invoice disagree about what a customer owes.
 */

export interface OrderTotals {
  subtotal: Tetri;
  discount: Tetri;
  total: Tetri;
  paidAmount: Tetri;
  balance: Tetri;
  paymentStatus: PaymentStatus;
}

export function calculateLineTotal(item: Pick<OrderItem, 'quantity' | 'unitPrice' | 'discount'>): Tetri {
  const gross = Math.round(item.quantity * item.unitPrice);
  return Math.max(0, gross - (item.discount || 0));
}

export function withLineTotals(items: OrderItem[]): OrderItem[] {
  return items.map((item) => ({ ...item, lineTotal: calculateLineTotal(item) }));
}

export function derivePaymentStatus(total: Tetri, paid: Tetri): PaymentStatus {
  if (paid <= 0) return 'UNPAID';
  if (paid < total) return 'PARTIAL';
  if (paid === total) return 'PAID';
  return 'OVERPAID';
}

export function calculateOrderTotals(
  items: OrderItem[],
  orderDiscount: Tetri,
  paidAmount: Tetri
): OrderTotals {
  const priced = withLineTotals(items);
  const subtotal = priced.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = Math.max(0, Math.min(orderDiscount || 0, subtotal));
  const total = subtotal - discount;
  const paid = Math.max(0, paidAmount || 0);

  return {
    subtotal,
    discount,
    total,
    paidAmount: paid,
    balance: total - paid,
    paymentStatus: derivePaymentStatus(total, paid),
  };
}

export function sumPayments(payments: Pick<Payment, 'amount'>[]): Tetri {
  return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
}

/** Re-derive an order's money from its items and its recorded payments. */
export function reconcileOrder(
  order: Pick<Order, 'items' | 'discount'>,
  payments: Pick<Payment, 'amount'>[]
): OrderTotals {
  return calculateOrderTotals(order.items, order.discount, sumPayments(payments));
}

/** ORD-2026-0001. The sequence restarts each calendar year. */
export function formatOrderNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

export function isOverdue(order: Pick<Order, 'deadline' | 'orderStatus'>, now = new Date()): boolean {
  if (!order.deadline) return false;
  if (order.orderStatus === 'COMPLETED' || order.orderStatus === 'CANCELLED') return false;
  return new Date(order.deadline).getTime() < now.getTime();
}

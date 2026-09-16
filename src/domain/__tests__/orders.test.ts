import { describe, expect, it } from 'vitest';
import type { OrderItem } from '../models.ts';
import {
  calculateOrderTotals,
  derivePaymentStatus,
  formatOrderNumber,
  isOverdue,
  reconcileOrder,
  sumPayments,
} from '../orders.ts';

const item = (over: Partial<OrderItem> = {}): OrderItem => ({
  id: 'i1',
  name: 'ონლაინ მოსაწვევი',
  quantity: 1,
  unitPrice: 20000,
  discount: 0,
  lineTotal: 0,
  ...over,
});

describe('calculateOrderTotals', () => {
  it('walks the acceptance scenario: 200 ₾ order, 50 ₾ paid, 150 ₾ left', () => {
    const totals = calculateOrderTotals([item()], 0, 5000);
    expect(totals.total).toBe(20000);
    expect(totals.paidAmount).toBe(5000);
    expect(totals.balance).toBe(15000);
    expect(totals.paymentStatus).toBe('PARTIAL');
  });

  it('multiplies quantity and subtracts the line discount', () => {
    const totals = calculateOrderTotals([item({ quantity: 3, discount: 1000 })], 0, 0);
    expect(totals.subtotal).toBe(59000);
  });

  it('applies the order-level discount on top of the lines', () => {
    const totals = calculateOrderTotals([item(), item({ id: 'i2' })], 5000, 0);
    expect(totals.subtotal).toBe(40000);
    expect(totals.discount).toBe(5000);
    expect(totals.total).toBe(35000);
  });

  it('never discounts below zero', () => {
    const totals = calculateOrderTotals([item()], 99999999, 0);
    expect(totals.total).toBe(0);
    expect(totals.discount).toBe(20000);
  });
});

describe('derivePaymentStatus', () => {
  it('names each state', () => {
    expect(derivePaymentStatus(10000, 0)).toBe('UNPAID');
    expect(derivePaymentStatus(10000, 4000)).toBe('PARTIAL');
    expect(derivePaymentStatus(10000, 10000)).toBe('PAID');
    expect(derivePaymentStatus(10000, 12000)).toBe('OVERPAID');
  });
});

describe('reconcileOrder', () => {
  it('derives the balance from the payment records, not a stored field', () => {
    const totals = reconcileOrder({ items: [item({ unitPrice: 50000 })], discount: 0 }, [
      { amount: 20000 },
      { amount: 10000 },
    ]);
    expect(sumPayments([{ amount: 20000 }, { amount: 10000 }])).toBe(30000);
    expect(totals.balance).toBe(20000);
    expect(totals.paymentStatus).toBe('PARTIAL');
  });
});

describe('formatOrderNumber', () => {
  it('zero-pads to four digits', () => {
    expect(formatOrderNumber('ORD', 2026, 1)).toBe('ORD-2026-0001');
    expect(formatOrderNumber('ORD', 2026, 142)).toBe('ORD-2026-0142');
  });
});

describe('isOverdue', () => {
  const now = new Date('2026-09-16T12:00:00Z');

  it('flags a passed deadline on live work', () => {
    expect(isOverdue({ deadline: '2026-09-10', orderStatus: 'IN_PROGRESS' }, now)).toBe(true);
  });

  it('leaves finished and cancelled work alone', () => {
    expect(isOverdue({ deadline: '2026-09-10', orderStatus: 'COMPLETED' }, now)).toBe(false);
    expect(isOverdue({ deadline: '2026-09-10', orderStatus: 'CANCELLED' }, now)).toBe(false);
  });

  it('ignores orders with no deadline', () => {
    expect(isOverdue({ deadline: null, orderStatus: 'NEW' }, now)).toBe(false);
  });
});

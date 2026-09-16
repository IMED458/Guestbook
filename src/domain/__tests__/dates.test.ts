import { describe, expect, it } from 'vitest';
import {
  formatDateLong,
  formatDateShort,
  formatRelativeDays,
  toDateInputValue,
} from '../dates.ts';

describe('formatDateShort', () => {
  it('always uses the Georgian day.month.year order, never the host locale', () => {
    expect(formatDateShort('2026-09-16T10:00:00')).toBe('16.09.2026');
  });

  it('zero-pads, so columns line up', () => {
    expect(formatDateShort('2026-01-05T10:00:00')).toBe('05.01.2026');
  });

  it('shows a dash rather than "Invalid Date"', () => {
    expect(formatDateShort(null)).toBe('—');
    expect(formatDateShort('not a date')).toBe('—');
  });
});

describe('formatDateLong', () => {
  it('names the month in Georgian', () => {
    expect(formatDateLong('2026-09-16T10:00:00')).toBe('16 სექტემბერი, 2026');
    expect(formatDateLong('2026-12-01T10:00:00')).toBe('1 დეკემბერი, 2026');
  });
});

describe('formatRelativeDays', () => {
  const now = new Date('2026-09-16T12:00:00');

  it('names today, tomorrow and yesterday', () => {
    expect(formatRelativeDays('2026-09-16T23:00:00', now)).toBe('დღეს');
    expect(formatRelativeDays('2026-09-17T01:00:00', now)).toBe('ხვალ');
    expect(formatRelativeDays('2026-09-15T23:00:00', now)).toBe('გუშინ');
  });

  it('counts whole days either side', () => {
    expect(formatRelativeDays('2026-09-19T08:00:00', now)).toBe('3 დღეში');
    expect(formatRelativeDays('2026-09-14T20:00:00', now)).toBe('2 დღით ადრე');
  });

  it('compares calendar days, not elapsed hours', () => {
    // 13 hours apart, but a different date — that is still "tomorrow".
    expect(formatRelativeDays('2026-09-17T01:00:00', new Date('2026-09-16T12:00:00'))).toBe('ხვალ');
  });
});

describe('toDateInputValue', () => {
  it('produces what a date input expects', () => {
    expect(toDateInputValue('2026-09-16T10:00:00')).toBe('2026-09-16');
    expect(toDateInputValue(null)).toBe('');
  });
});

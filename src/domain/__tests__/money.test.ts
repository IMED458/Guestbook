import { describe, expect, it } from 'vitest';
import { formatAmount, formatGel, lariToTetri, parseLariInput, tetriToLari } from '../money.ts';

describe('parseLariInput', () => {
  it('reads plain and decimal lari', () => {
    expect(parseLariInput('500')).toBe(50000);
    expect(parseLariInput('500.5')).toBe(50050);
    expect(parseLariInput('0.01')).toBe(1);
  });

  it('accepts a comma as the decimal separator', () => {
    expect(parseLariInput('30,50')).toBe(3050);
  });

  it('ignores spacing', () => {
    expect(parseLariInput(' 1 200.25 ')).toBe(120025);
  });

  it('rejects anything that is not a number', () => {
    expect(parseLariInput('abc')).toBeNull();
    expect(parseLariInput('')).toBeNull();
    expect(parseLariInput('12.34.56')).toBeNull();
  });

  it('does not accumulate binary floating point error', () => {
    // 0.1 + 0.2 in floats is 0.30000000000000004; in tetri it is exactly 30.
    expect(parseLariInput('0.1')! + parseLariInput('0.2')!).toBe(30);
  });
});

describe('formatting', () => {
  it('always shows two decimals', () => {
    expect(formatAmount(50000)).toBe('500.00');
    expect(formatAmount(50050)).toBe('500.50');
    expect(formatAmount(5)).toBe('0.05');
  });

  it('appends the lari sign', () => {
    expect(formatGel(20000)).toBe('200.00 ₾');
  });

  it('handles negatives, which is what an overpaid balance looks like', () => {
    expect(formatAmount(-1500)).toBe('-15.00');
  });

  it('round-trips through lari', () => {
    expect(lariToTetri(tetriToLari(12345))).toBe(12345);
  });
});

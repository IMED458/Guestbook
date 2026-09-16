import type { Tetri } from './models.ts';

/**
 * Money is stored as an integer number of tetri, never as a float: 500.00 ₾
 * is 50000. Storing 0.1 + 0.2 in a balance column is how accounting systems
 * end up two tetri short, so every conversion goes through here.
 */

export const TETRI_PER_LARI = 100;

/** "500", "500.5", "500,50" → 50000. Returns null when it is not a number. */
export function parseLariInput(input: string): Tetri | null {
  const cleaned = input.replace(/\s/g, '').replace(',', '.');
  if (!cleaned) return null;
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;

  // Round at the tetri, not at the lari, and away from binary noise.
  return Math.round(value * TETRI_PER_LARI);
}

export function lariToTetri(lari: number): Tetri {
  return Math.round(lari * TETRI_PER_LARI);
}

export function tetriToLari(tetri: Tetri): number {
  return tetri / TETRI_PER_LARI;
}

/** "50000" → "500.00". The plain number, no symbol. */
export function formatAmount(tetri: Tetri): string {
  const negative = tetri < 0;
  const abs = Math.abs(Math.round(tetri));
  const lari = Math.floor(abs / TETRI_PER_LARI);
  const rest = abs % TETRI_PER_LARI;
  const grouped = lari.toLocaleString('ka-GE');
  return `${negative ? '-' : ''}${grouped}.${String(rest).padStart(2, '0')}`;
}

/** "50000" → "500.00 ₾". What the UI shows. */
export function formatGel(tetri: Tetri): string {
  return `${formatAmount(tetri)} ₾`;
}

/** Compact form for dashboard tiles: 12450000 → "124.5 ათასი ₾". */
export function formatGelCompact(tetri: Tetri): string {
  const lari = Math.abs(tetri) / TETRI_PER_LARI;
  if (lari >= 1000) {
    return `${(lari / 1000).toFixed(1)} ათასი ₾`;
  }
  return formatGel(tetri);
}

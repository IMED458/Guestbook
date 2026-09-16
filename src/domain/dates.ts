/**
 * One date format for the whole system.
 *
 * `toLocaleDateString('ka-GE')` falls back to the host's own locale when the
 * runtime has no Georgian data, which is how a Georgian admin panel ends up
 * printing 9/16/2026. These build the string explicitly instead.
 */

const MONTHS_KA = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 16.09.2026 — compact, for tables. */
export function formatDateShort(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

/** 16 სექტემბერი, 2026 — for headings and detail views. */
export function formatDateLong(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return '—';
  return `${date.getDate()} ${MONTHS_KA[date.getMonth()]}, ${date.getFullYear()}`;
}

/** 16.09.2026, 14:30 — when the time of day matters. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return '—';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formatDateShort(date)}, ${hours}:${minutes}`;
}

/** "3 დღეში" / "2 დღით ადრე" — for deadlines. */
export function formatRelativeDays(value: string | Date | null | undefined, now = new Date()): string {
  const date = parse(value);
  if (!date) return '—';

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86400000);

  if (days === 0) return 'დღეს';
  if (days === 1) return 'ხვალ';
  if (days === -1) return 'გუშინ';
  if (days > 0) return `${days} დღეში`;
  return `${Math.abs(days)} დღით ადრე`;
}

/** The value an <input type="date"> expects. */
export function toDateInputValue(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

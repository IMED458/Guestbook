import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../lib/firebase.ts';

/**
 * Thin, typed helpers over Firestore.
 *
 * Two rules hold everywhere in this layer:
 *
 *  - Queries use equality filters only and sort in the browser. Firestore
 *    serves equality-only queries from its automatic single-field indexes, so
 *    the project needs no composite index and no deployment step when a new
 *    filter appears.
 *  - Security rules are not filters: a list query is refused outright unless
 *    the query itself proves every matching document is readable. So a caller
 *    that is scoped to one client must say so in the query, not afterwards.
 */

export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 16);
  return `${prefix}_${random}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Firestore rejects `undefined`; absent optional fields become null. */
export function clean<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = value === undefined ? null : value;
  }
  return out;
}

export async function getOne<T>(path: string, id: string): Promise<(T & { id: string }) | null> {
  const snap = await getDoc(doc(db, path, id));
  if (!snap.exists()) return null;
  return { ...(snap.data() as T), id: snap.id };
}

export async function listWhere<T>(
  path: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  const snap = await getDocs(query(collection(db, path), ...constraints));
  return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
}

export async function createOne<T extends Record<string, unknown>>(
  path: string,
  id: string,
  data: T
): Promise<void> {
  await setDoc(doc(db, path, id), clean(data));
}

export async function updateOne<T extends Record<string, unknown>>(
  path: string,
  id: string,
  data: T
): Promise<void> {
  await updateDoc(doc(db, path, id), clean({ ...data, updatedAt: nowIso() }));
}

export async function deleteOne(path: string, id: string): Promise<void> {
  await deleteDoc(doc(db, path, id));
}

export { where };

/** Newest first, by any ISO date field. Sorting happens here, not in Firestore. */
export function byNewest<T>(field: keyof T = 'createdAt' as keyof T) {
  return (a: T, b: T) =>
    new Date(String(b[field] ?? 0)).getTime() - new Date(String(a[field] ?? 0)).getTime();
}

/** Case-insensitive contains across the given fields. */
export function matchesSearch<T>(item: T, fields: (keyof T)[], search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => String(item[field] ?? '').toLowerCase().includes(needle));
}

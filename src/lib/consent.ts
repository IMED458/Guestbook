/**
 * Cookie / storage consent.
 *
 * The app sets no advertising or third-party tracking storage at all. Two
 * categories exist:
 *
 *   necessary — sign-in session, the language switch, a private book you have
 *               unlocked, the id that lets you take back your own reaction,
 *               and the record of this choice. Cannot be switched off, and
 *               none of it leaves the site.
 *   analytics — counting page views per day for the host's dashboard.
 *
 * Nothing in the analytics category runs until the visitor opts in.
 */

export type ConsentCategory = 'necessary' | 'analytics';

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  /** ISO timestamp, so we can show when the choice was made and re-ask later. */
  decidedAt: string;
  version: number;
}

const STORAGE_KEY = 'gb_consent_v1';
export const CONSENT_VERSION = 1;

/** Re-ask once a year, which is the usual supervisory-authority expectation. */
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

const listeners = new Set<(state: ConsentState | null) => void>();

function read(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (Date.now() - new Date(parsed.decidedAt).getTime() > MAX_AGE_MS) return null;
    return { ...parsed, necessary: true };
  } catch {
    return null;
  }
}

let current: ConsentState | null = read();

export function getConsent(): ConsentState | null {
  return current;
}

export function hasDecided(): boolean {
  return current !== null;
}

export function allows(category: ConsentCategory): boolean {
  if (category === 'necessary') return true;
  return current?.analytics === true;
}

export function setConsent(analytics: boolean): void {
  current = {
    necessary: true,
    analytics,
    decidedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // A visitor blocking storage entirely still gets the app, just no memory
    // of the choice — which is the privacy-preserving outcome anyway.
  }
  listeners.forEach((fn) => fn(current));
}

/** Withdrawing consent must be as easy as giving it. */
export function withdrawConsent(): void {
  setConsent(false);
}

/** Re-open the banner so a visitor can change their mind. */
export function resetConsent(): void {
  current = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
  listeners.forEach((fn) => fn(null));
}

export function onConsentChange(fn: (state: ConsentState | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

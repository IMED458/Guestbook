/**
 * Usernames.
 *
 * People sign in with `imedo`, not with an email address. Firebase Auth only
 * speaks email, so a username is mapped to a synthetic address inside a domain
 * we control. That address is an implementation detail and is never shown in
 * the UI — a client's real address lives in `contactEmail`.
 */

/** Not a real mail domain; it only has to be syntactically valid and ours. */
export const AUTH_EMAIL_DOMAIN =
  import.meta.env?.VITE_AUTH_EMAIL_DOMAIN || 'users.guestbook.local';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;

/** Lowercase, trimmed, internal whitespace removed. Comparison form. */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '');
}

export interface UsernameValidation {
  valid: boolean;
  /** A translation key, so the message itself stays in the i18n catalogue. */
  reason?:
    | 'username.tooShort'
    | 'username.tooLong'
    | 'username.invalidChars'
    | 'username.startsWithNonLetter';
}

export function validateUsername(input: string): UsernameValidation {
  const username = normalizeUsername(input);

  if (username.length < USERNAME_MIN_LENGTH) {
    return { valid: false, reason: 'username.tooShort' };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { valid: false, reason: 'username.tooLong' };
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return { valid: false, reason: 'username.invalidChars' };
  }
  if (!/^[a-z]/.test(username)) {
    return { valid: false, reason: 'username.startsWithNonLetter' };
  }

  return { valid: true };
}

export function usernameToAuthEmail(username: string, domain = AUTH_EMAIL_DOMAIN): string {
  return `${normalizeUsername(username)}@${domain}`;
}

/** Only useful for display fallbacks; the stored username is authoritative. */
export function authEmailToUsername(authEmail: string): string {
  return normalizeUsername(authEmail.split('@')[0] || '');
}

/** Whether a string the user typed looks like an email rather than a username. */
export function looksLikeEmail(input: string): boolean {
  return /@/.test(input.trim());
}

/**
 * A readable temporary password. Ambiguous glyphs (0/O, 1/l/I) are left out so
 * it survives being read aloud or copied off a printout.
 */
export function generateTemporaryPassword(length = 10): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

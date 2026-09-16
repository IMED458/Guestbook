import { describe, expect, it } from 'vitest';
import {
  authEmailToUsername,
  generateTemporaryPassword,
  looksLikeEmail,
  normalizeUsername,
  usernameToAuthEmail,
  validateUsername,
} from '../username.ts';

describe('normalizeUsername', () => {
  it('lowercases and strips whitespace', () => {
    expect(normalizeUsername('  IMEDO  ')).toBe('imedo');
    expect(normalizeUsername('im edo')).toBe('imedo');
  });

  it('makes comparison case-insensitive', () => {
    expect(normalizeUsername('Imedo')).toBe(normalizeUsername('iMEDO'));
  });
});

describe('validateUsername', () => {
  it('accepts a normal username', () => {
    expect(validateUsername('imedo').valid).toBe(true);
    expect(validateUsername('nika.maisuradze').valid).toBe(true);
  });

  it('rejects one that is too short or too long', () => {
    expect(validateUsername('ab').reason).toBe('username.tooShort');
    expect(validateUsername('a'.repeat(40)).reason).toBe('username.tooLong');
  });

  it('rejects non-latin and punctuation we do not allow', () => {
    expect(validateUsername('იმედო').reason).toBe('username.invalidChars');
    expect(validateUsername('ime@do').reason).toBe('username.invalidChars');
  });

  it('requires a letter first, so a username cannot look like an id', () => {
    expect(validateUsername('1imedo').reason).toBe('username.startsWithNonLetter');
  });
});

describe('auth email mapping', () => {
  it('maps a username to an internal address and back', () => {
    const email = usernameToAuthEmail('Imedo', 'auth.example');
    expect(email).toBe('imedo@auth.example');
    expect(authEmailToUsername(email)).toBe('imedo');
  });
});

describe('looksLikeEmail', () => {
  it('spots someone typing an address into the username box', () => {
    expect(looksLikeEmail('client@gmail.com')).toBe(true);
    expect(looksLikeEmail('imedo')).toBe(false);
  });
});

describe('generateTemporaryPassword', () => {
  it('has the requested length', () => {
    expect(generateTemporaryPassword(12)).toHaveLength(12);
  });

  it('omits glyphs that are misread when spoken or printed', () => {
    const sample = Array.from({ length: 40 }, () => generateTemporaryPassword(24)).join('');
    expect(sample).not.toMatch(/[0O1lI]/);
  });

  it('does not repeat itself', () => {
    expect(generateTemporaryPassword()).not.toBe(generateTemporaryPassword());
  });
});

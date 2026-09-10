/**
 * Real business details.
 *
 * ⚠️ TODO — replace every [PLACEHOLDER] before going live. Georgian and EU
 * consumer law both require a trader to publish who they are, where they are,
 * and how to reach them. Until these are filled in, the legal pages below are
 * templates, not a compliant imprint.
 */
interface SiteDetails {
  productName: string;
  legalName: string;
  registrationNumber: string;
  address: string;
  email: string;
  /** Optional; an empty string hides the row rather than showing a fake number. */
  phone: string;
  privacyEmail: string;
  lastUpdated: string;
}

export const SITE: SiteDetails = {
  productName: 'Memoria',

  /** Registered trading name of the operator. */
  legalName: '[COMPANY_LEGAL_NAME]',

  /** Georgian identification / VAT number, or the equivalent abroad. */
  registrationNumber: '[REGISTRATION_NUMBER]',

  /** Full registered address. */
  address: '[STREET, CITY, POSTAL CODE, COUNTRY]',

  /** A monitored address — this one is published as the contact of record. */
  email: '[contact@example.com]',

  /** Optional; leave empty to hide the row rather than show a fake number. */
  phone: '',

  /** Who to write to about personal data. Often the same as `email`. */
  privacyEmail: '[privacy@example.com]',

  /** Date the current version of the legal pages took effect. */
  lastUpdated: '2026-09-11',
};

/** True once the operator's identity has actually been filled in. */
export const businessDetailsComplete = !SITE.legalName.startsWith('[');

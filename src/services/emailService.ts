import emailjs from '@emailjs/browser';
import type { EmailLog } from '../domain/models.ts';
import { byNewest, createOne, listWhere, newId, nowIso } from './firestoreHelpers.ts';

/**
 * EmailJS sends from the browser on purpose: its public key is designed to
 * ship, and the protection is the allowed-origins list configured in the
 * EmailJS dashboard, not secrecy. Nothing private belongs in here.
 */

const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';

/**
 * One EmailJS template can carry every message we send: the subject and the
 * body travel as variables, so the template is a shell rather than a letter.
 * A per-message template id is still honoured when one is configured, for
 * anyone who wants different layouts.
 */
const DEFAULT_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_DEFAULT || '';

export const emailConfigured = Boolean(PUBLIC_KEY && SERVICE_ID && DEFAULT_TEMPLATE_ID);

/** Which EmailJS template carries this message. */
export function resolveTemplateId(templateEnv?: string, override?: string): string {
  if (override) return override;
  if (templateEnv) {
    const specific = (import.meta.env as Record<string, string>)[templateEnv];
    if (specific) return specific;
  }
  return DEFAULT_TEMPLATE_ID;
}

export interface EmailTemplate {
  key: string;
  label: string;
  subject: string;
  body: string;
  /** Which EmailJS template id carries it, when one is configured. */
  templateEnv: string;
}

/**
 * Templates live here rather than only in the EmailJS dashboard so the wording
 * is reviewable in the repository and the variables are visible to the person
 * composing the message.
 */
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    key: 'order_ready',
    label: 'შეკვეთა მზადაა',
    subject: 'თქვენი შეკვეთა მზად არის',
    body: `გამარჯობა {{client_name}},

თქვენი შეკვეთა №{{order_number}} მზად არის.

დარჩენილი გადასახდელი თანხა: {{balance}}

მადლობა.`,
    templateEnv: 'VITE_EMAILJS_TEMPLATE_ORDER_READY',
  },
  {
    key: 'order_shipped',
    label: 'კურიერს გადაეცა',
    subject: 'თქვენი შეკვეთა გზაშია',
    body: `გამარჯობა {{client_name}},

თქვენი შეკვეთა №{{order_number}} გადაეცა კურიერს.

{{courier_info}}`,
    templateEnv: 'VITE_EMAILJS_TEMPLATE_ORDER_SHIPPED',
  },
  {
    key: 'payment_reminder',
    label: 'გადახდის შეხსენება',
    subject: 'გადასახდელი თანხის შეხსენება',
    body: `გამარჯობა {{client_name}},

შეგახსენებთ, რომ შეკვეთაზე №{{order_number}} დარჩენილია გადასახდელი: {{balance}}

მადლობა.`,
    templateEnv: 'VITE_EMAILJS_TEMPLATE_PAYMENT_REMINDER',
  },
  {
    key: 'guestbook_ready',
    label: 'სტუმრების წიგნი მზადაა',
    subject: 'თქვენი ციფრული სტუმრების წიგნი მზად არის',
    body: `გამარჯობა {{client_name}},

თქვენი ციფრული სტუმრების წიგნი მზად არის.

ბმული: {{guestbook_url}}

QR კოდი ხელმისაწვდომია პირად კაბინეტში.`,
    templateEnv: 'VITE_EMAILJS_TEMPLATE_GUESTBOOK_READY',
  },
  {
    key: 'album_ready',
    label: 'ციფრული ალბომი მზადაა',
    subject: 'თქვენი ციფრული ალბომი მზად არის',
    body: `გამარჯობა {{client_name}},

თქვენი ციფრული ალბომი მზად არის.

ბმული: {{album_url}}

QR კოდი ხელმისაწვდომია პირად კაბინეტში.`,
    templateEnv: 'VITE_EMAILJS_TEMPLATE_ALBUM_READY',
  },
  {
    key: 'credentials',
    label: 'ანგარიშის მონაცემები',
    subject: 'თქვენი ანგარიში მზად არის',
    body: `გამარჯობა {{client_name}},

თქვენი ანგარიში მზად არის.

მომხმარებელი: {{username}}
დროებითი პაროლი: {{temporary_password}}

უსაფრთხოების მიზნით პირველივე შესვლისას პაროლის შეცვლას მოგთხოვთ.`,
    templateEnv: 'VITE_EMAILJS_TEMPLATE_CREDENTIALS',
  },
  {
    key: 'custom',
    label: 'თავისუფალი წერილი',
    subject: '',
    body: '',
    templateEnv: 'VITE_EMAILJS_TEMPLATE_CUSTOM',
  },
];

/** Replace {{name}} with what the composer supplied; leave unknown ones alone. */
export function fillTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    variables[key] !== undefined ? variables[key] : match
  );
}

export function templateVariables(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}

export interface SendInput {
  templateKey: string;
  /** Overrides the template id for this one send. */
  emailjsTemplateId?: string;
  recipient: string;
  recipientName: string;
  subject: string;
  body: string;
  clientId?: string;
  orderId?: string;
  eventId?: string;
}

export const emailService = {
  async send(input: SendInput, actor: { id: string; name: string }): Promise<void> {
    const template = EMAIL_TEMPLATES.find((t) => t.key === input.templateKey);
    const templateId = resolveTemplateId(template?.templateEnv, input.emailjsTemplateId);

    if (!PUBLIC_KEY || !SERVICE_ID) throw new Error('EmailJS არ არის კონფიგურირებული');
    if (!templateId) {
      throw new Error('EmailJS-ის template id არ არის მითითებული — შეავსეთ VITE_EMAILJS_TEMPLATE_DEFAULT');
    }

    const logId = newId('eml');
    const now = nowIso();

    try {
      await emailjs.send(
        SERVICE_ID,
        templateId,
        {
          // Common EmailJS field names, sent under several aliases so the
          // template works whichever convention it was written with.
          to_email: input.recipient,
          email: input.recipient,
          reply_to: input.recipient,
          to_name: input.recipientName,
          name: input.recipientName,
          subject: input.subject,
          title: input.subject,
          message: input.body,
          content: input.body,
        },
        { publicKey: PUBLIC_KEY }
      );

      await createOne('emailLogs', logId, {
        clientId: input.clientId || null,
        orderId: input.orderId || null,
        eventId: input.eventId || null,
        recipient: input.recipient,
        subject: input.subject,
        templateKey: input.templateKey,
        sentBy: actor.id,
        sentByName: actor.name,
        sentAt: now,
        status: 'SENT',
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // A failure is recorded too — silence is what makes "did it send?"
      // unanswerable a week later.
      await createOne('emailLogs', logId, {
        clientId: input.clientId || null,
        orderId: input.orderId || null,
        eventId: input.eventId || null,
        recipient: input.recipient,
        subject: input.subject,
        templateKey: input.templateKey,
        sentBy: actor.id,
        sentByName: actor.name,
        sentAt: now,
        status: 'FAILED',
        error: message.slice(0, 500),
      }).catch(() => {});
      throw err;
    }
  },

  async listLogs(): Promise<EmailLog[]> {
    const all = await listWhere<EmailLog>('emailLogs');
    return all.sort(byNewest('sentAt'));
  },
};

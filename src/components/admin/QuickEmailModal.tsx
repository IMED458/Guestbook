import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import type { Client, EventRecord, Order } from '../../domain/models.ts';
import { emailConfigured, emailService, fillTemplate, templateVariables } from '../../services/emailService.ts';
import { templateStore, type StoredTemplate } from '../../services/templateService.ts';
import { formatGel } from '../../domain/money.ts';
import { loginUrl, publicAlbumUrl, publicEventUrl, publicGuestBookUrl } from '../../lib/urls.ts';
import { useSession } from '../../lib/session.tsx';
import { Field, inputClass } from '../ui/Field.tsx';
import { Modal, primaryButton, secondaryButton } from '../ui/Modal.tsx';
import { useToast } from '../ui/Toast.tsx';

/**
 * Writing to a client from wherever you already are — their page, or an
 * order — rather than navigating to a separate mail screen and re-selecting
 * everything you had just been looking at.
 */
export const QuickEmailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  orders?: Order[];
  events?: EventRecord[];
  /** Preselect a template, e.g. "order ready" from the order page. */
  defaultTemplateKey?: string;
  defaultOrderId?: string;
  /**
   * A freshly issued login, held in memory only. Nothing stores a password,
   * so this is the one moment it can be put into a letter — after the modal
   * closes it is gone for good.
   */
  credentials?: { username: string; password: string } | null;
  onSent?: () => void;
}> = ({ isOpen, onClose, client, orders = [], events = [], defaultTemplateKey, defaultOrderId, credentials, onSent }) => {
  const { user } = useSession();
  const toast = useToast();

  const [templates, setTemplates] = useState<StoredTemplate[]>([]);
  const [templateKey, setTemplateKey] = useState(defaultTemplateKey || 'order_ready');
  const [orderId, setOrderId] = useState(defaultOrderId || '');
  const [recipient, setRecipient] = useState(client.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    templateStore.list().then(setTemplates).catch(() => setTemplates([]));
    setRecipient(client.email || '');
    setOrderId(defaultOrderId || '');
    if (defaultTemplateKey) setTemplateKey(defaultTemplateKey);
  }, [isOpen, client.email, defaultOrderId, defaultTemplateKey]);

  useEffect(() => {
    const template = templates.find((t) => t.key === templateKey);
    if (!template) return;
    setSubject(template.subject);
    setBody(template.body);
  }, [templateKey, templates]);

  const order = orders.find((o) => o.id === orderId);
  const [eventId, setEventId] = useState('');
  const event = events.find((e) => e.id === eventId) || events[0];

  const variables = useMemo<Record<string, string>>(
    () => ({
      client_name: client.displayName,
      order_number: order?.orderNumber || '',
      balance: order ? formatGel(order.balance) : '',
      total: order ? formatGel(order.total) : '',
      courier_info: order?.courierInfo || '',
      guestbook_url: event?.hasGuestbook ? publicGuestBookUrl(event.slug) : '',
      album_url: event?.hasAlbum ? publicAlbumUrl(event.slug) : '',
      event_url: event ? publicEventUrl(event.slug) : '',
      event_title: event?.title || '',
      login_url: loginUrl(),
      username: credentials?.username || '',
      temporary_password: credentials?.password || '',
    }),
    [client, order, event, credentials]
  );

  const previewSubject = fillTemplate(subject, variables);
  const previewBody = fillTemplate(body, variables);
  const unresolved = templateVariables(previewBody);

  const send = async () => {
    if (!recipient.trim()) {
      toast.error('მიმღების ელფოსტა სავალდებულოა');
      return;
    }
    setSending(true);
    try {
      await emailService.send(
        {
          templateKey,
          recipient: recipient.trim(),
          recipientName: client.displayName,
          subject: previewSubject,
          body: previewBody,
          clientId: client.id,
          orderId: orderId || undefined,
          eventId: event?.id,
        },
        { id: user?.id || '', name: `${user?.firstName} ${user?.lastName}`.trim() || user?.username || '' }
      );
      toast.success('ელფოსტა გაიგზავნა');
      onSent?.();
      onClose();
    } catch (err) {
      console.error('quick email failed', err);
      toast.error(err instanceof Error ? err.message : 'გაგზავნა ვერ მოხერხდა');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={`წერილი — ${client.displayName}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose} disabled={sending}>
            გაუქმება
          </button>
          <button type="button" className={`${primaryButton} inline-flex items-center gap-1.5`} onClick={send} disabled={sending || !emailConfigured}>
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            {sending ? 'იგზავნება...' : 'გაგზავნა'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {!emailConfigured && (
          <div role="alert" className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-[13px] text-amber-900 leading-relaxed">
            EmailJS ჯერ არ არის კონფიგურირებული — წერილი ვერ გაიგზავნება.
            შეავსეთ VITE_EMAILJS_PUBLIC_KEY და VITE_EMAILJS_SERVICE_ID.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="qe-template" label="თარგი">
            {() => (
              <select id="qe-template" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className={inputClass}>
                {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            )}
          </Field>

          {events.length > 1 && (
            <Field id="qe-event" label="ღონისძიება">
              {() => (
                <select id="qe-event" value={event?.id || ''} onChange={(e) => setEventId(e.target.value)} className={inputClass}>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              )}
            </Field>
          )}

          {orders.length > 0 && (
            <Field id="qe-order" label="შეკვეთა">
              {() => (
                <select id="qe-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNumber}</option>)}
                </select>
              )}
            </Field>
          )}
        </div>

        <Field id="qe-to" label="მიმღები" required>
          {() => <input id="qe-to" type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} className={inputClass} />}
        </Field>

        <Field id="qe-subject" label="თემა">
          {() => <input id="qe-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />}
        </Field>

        <Field id="qe-body" label="ტექსტი">
          {() => (
            <textarea id="qe-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} className={`${inputClass} font-mono text-[12px]`} />
          )}
        </Field>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">გადახედვა</p>
          <p className="mt-1 text-sm font-medium text-stone-900">{previewSubject || '—'}</p>
          <p className="mt-2 text-[13px] text-stone-800 leading-relaxed whitespace-pre-line">{previewBody}</p>
        </div>

        {unresolved.length > 0 && (
          <p role="status" className="text-[11px] text-amber-800 leading-relaxed">
            შეუვსებელი: {unresolved.map((v) => `{{${v}}}`).join(', ')}
            {unresolved.includes('temporary_password') && (
              <>
                {' — '}პაროლი მხოლოდ ანგარიშის შექმნის ან პაროლის შეცვლის მომენტში
                ჩაისმება, რადგან სისტემა მას არსად არ ინახავს. გამოიყენეთ
                „პაროლის შეცვლა“ და იქიდან გააგზავნეთ.
              </>
            )}
          </p>
        )}
      </div>
    </Modal>
  );
};

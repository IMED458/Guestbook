import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import type { Client, EmailLog, Order } from '../../domain/models.ts';
import {
  emailConfigured,
  emailService,
  fillTemplate,
  templateVariables,
} from '../../services/emailService.ts';
import { templateStore, type StoredTemplate } from '../../services/templateService.ts';
import { Card, CardHeader, PageHeader } from '../../components/ui/Card.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { Modal, secondaryButton } from '../../components/ui/Modal.tsx';
import { clientService } from '../../services/clientService.ts';
import { orderService } from '../../services/orderService.ts';
import { formatGel } from '../../domain/money.ts';
import { formatDateTime } from '../../domain/dates.ts';
import { useSession } from '../../lib/session.tsx';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { primaryButton } from '../../components/ui/Modal.tsx';
import { EmptyState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

export const EmailPage: React.FC = () => {
  const { user } = useSession();
  const toast = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<EmailLog[] | null>(null);
  const [templates, setTemplates] = useState<StoredTemplate[]>([]);

  // Template editing
  const [tab, setTab] = useState<'compose' | 'templates'>('compose');
  const [editing, setEditing] = useState<StoredTemplate | null>(null);
  const [draft, setDraft] = useState({ label: '', subject: '', body: '', emailjsTemplateId: '' });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleting, setDeleting] = useState<StoredTemplate | null>(null);

  const [templateKey, setTemplateKey] = useState('order_ready');
  const [clientId, setClientId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [clientList, orderList, logList, templateList] = await Promise.all([
        clientService.list(),
        orderService.list(),
        emailService.listLogs().catch(() => []),
        templateStore.list().catch(() => []),
      ]);
      setClients(clientList);
      setOrders(orderList);
      setLogs(logList);
      setTemplates(templateList);
    } catch (err) {
      console.error('email page load failed', err);
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const client = clients.find((c) => c.id === clientId);
  const order = orders.find((o) => o.id === orderId);

  /** Everything the chosen template could ask for, filled from the real records. */
  const variables = useMemo<Record<string, string>>(
    () => ({
      client_name: client?.displayName || '',
      order_number: order?.orderNumber || '',
      balance: order ? formatGel(order.balance) : '',
      courier_info: order?.courierInfo || '',
      username: '',
      temporary_password: '',
      guestbook_url: '',
      album_url: '',
    }),
    [client, order]
  );

  // Load the template's wording whenever the choice changes.
  useEffect(() => {
    const template = templates.find((t) => t.key === templateKey);
    if (!template) return;
    setSubject(template.subject);
    setBody(template.body);
  }, [templateKey, templates]);

  useEffect(() => {
    if (client?.email) setRecipient(client.email);
  }, [client]);

  const previewSubject = fillTemplate(subject, variables);
  const previewBody = fillTemplate(body, variables);
  const unresolved = templateVariables(previewBody);

  const handleSend = async () => {
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
          recipientName: client?.displayName || '',
          subject: previewSubject,
          body: previewBody,
          clientId: clientId || undefined,
          orderId: orderId || undefined,
        },
        { id: user?.id || '', name: `${user?.firstName} ${user?.lastName}`.trim() || user?.username || '' }
      );
      toast.success('ელფოსტა გაიგზავნა');
      await load();
    } catch (err) {
      console.error('send failed', err);
      toast.error(err instanceof Error ? err.message : 'გაგზავნა ვერ მოხერხდა');
    } finally {
      setSending(false);
    }
  };

  const openTemplate = (template: StoredTemplate | null) => {
    setEditing(template);
    setDraft(
      template
        ? {
            label: template.label,
            subject: template.subject,
            body: template.body,
            emailjsTemplateId: template.emailjsTemplateId || '',
          }
        : { label: '', subject: '', body: '', emailjsTemplateId: '' }
    );
  };

  const saveTemplate = async () => {
    if (!draft.label.trim()) {
      toast.error('თარგის სახელი სავალდებულოა');
      return;
    }
    setSavingTemplate(true);
    try {
      await templateStore.save({
        key: editing ? editing.key : templateStore.makeKey(draft.label, templates),
        label: draft.label,
        subject: draft.subject,
        body: draft.body,
        emailjsTemplateId: draft.emailjsTemplateId || undefined,
        builtIn: editing?.builtIn ?? false,
        sortOrder: editing?.sortOrder ?? templates.length,
        id: editing?.id,
      });
      toast.success(editing ? 'თარგი განახლდა' : 'თარგი დაემატა');
      setEditing(null);
      setDraft({ label: '', subject: '', body: '', emailjsTemplateId: '' });
      await load();
    } catch (err) {
      console.error('template save failed', err);
      toast.error('შენახვა ვერ მოხერხდა');
    } finally {
      setSavingTemplate(false);
    }
  };

  const removeTemplate = async () => {
    if (!deleting) return;
    try {
      await templateStore.remove(deleting);
      toast.success('თარგი წაიშალა');
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'წაშლა ვერ მოხერხდა');
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="ელფოსტა"
        subtitle="შეტყობინება კლიენტს, თარგიდან ან თავისუფლად"
        action={
          <div className="flex gap-1 rounded-xl border border-stone-300 bg-white p-1">
            {([
              ['compose', 'წერილი'],
              ['templates', 'თარგები'],
            ] as ['compose' | 'templates', string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors ${
                  tab === id ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {!emailConfigured && (
        <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 max-w-2xl">
          <p className="text-sm text-amber-900 leading-relaxed">
            EmailJS ჯერ არ არის კონფიგურირებული. შეავსეთ{' '}
            <code className="font-mono text-[12px]">VITE_EMAILJS_PUBLIC_KEY</code> და{' '}
            <code className="font-mono text-[12px]">VITE_EMAILJS_SERVICE_ID</code>, ასევე
            თითოეული თარგის template id. ინსტრუქცია — SETUP.md.
          </p>
        </div>
      )}

      {tab === 'templates' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card padded={false} className="overflow-hidden">
            <div className="px-5 pt-5">
              <CardHeader
                title="თარგები"
                subtitle={`${templates.length} თარგი`}
                action={
                  <button type="button" onClick={() => openTemplate(null)} className={`${secondaryButton} inline-flex items-center gap-1.5 !py-1.5 !px-3`}>
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    დამატება
                  </button>
                }
              />
            </div>

            <ul className="divide-y divide-stone-100">
              {templates.map((template) => (
                <li key={template.key} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-stone-900">
                      {template.label}
                      {template.builtIn && (
                        <span className="ml-2 text-[10px] font-medium text-stone-500">ჩაშენებული</span>
                      )}
                    </p>
                    <p className="text-[11px] text-stone-600 truncate">{template.subject || '— სათაურის გარეშე —'}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => openTemplate(template)} aria-label={`${template.label} — რედაქტირება`} className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    {!template.builtIn && (
                      <button type="button" onClick={() => setDeleting(template)} aria-label={`${template.label} — წაშლა`} className="p-1.5 rounded-lg text-stone-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title={editing ? 'თარგის რედაქტირება' : 'ახალი თარგი'}
              subtitle={editing?.builtIn ? 'ჩაშენებული თარგის ტექსტი იცვლება, წაშლა — არა.' : undefined}
            />
            <div className="space-y-4">
              <Field id="tpl-label" label="სახელი" required>
                {() => <input id="tpl-label" value={draft.label} onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))} placeholder="მაგ. მადლობა შეკვეთისთვის" className={inputClass} />}
              </Field>

              <Field id="tpl-subject" label="თემა">
                {() => <input id="tpl-subject" value={draft.subject} onChange={(e) => setDraft((p) => ({ ...p, subject: e.target.value }))} className={inputClass} />}
              </Field>

              <Field
                id="tpl-body"
                label="ტექსტი"
                hint="ცვლადები: {{client_name}}, {{order_number}}, {{balance}}, {{total}}, {{guestbook_url}}, {{album_url}}, {{event_title}}, {{courier_info}}"
              >
                {(d) => (
                  <textarea id="tpl-body" rows={10} value={draft.body} onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))} aria-describedby={d} className={`${inputClass} font-mono text-[12px]`} />
                )}
              </Field>

              <Field id="tpl-emailjs" label="EmailJS template id" hint="ცარიელი დატოვეთ, თუ საერთო თარგს იყენებთ.">
                {(d) => <input id="tpl-emailjs" value={draft.emailjsTemplateId} onChange={(e) => setDraft((p) => ({ ...p, emailjsTemplateId: e.target.value }))} aria-describedby={d} className={`${inputClass} font-mono`} />}
              </Field>

              <div className="flex gap-2">
                {editing && (
                  <button type="button" onClick={() => openTemplate(null)} className={`${secondaryButton} flex-1`}>
                    გაუქმება
                  </button>
                )}
                <button type="button" onClick={saveTemplate} disabled={savingTemplate} className={`${primaryButton} flex-1`}>
                  {savingTemplate ? 'ინახება...' : 'შენახვა'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <Field id="email-template" label="თარგი">
            {() => (
              <select id="email-template" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className={inputClass}>
                {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="email-client" label="კლიენტი">
              {() => (
                <select id="email-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                </select>
              )}
            </Field>
            <Field id="email-order" label="შეკვეთა">
              {() => (
                <select id="email-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {orders
                    .filter((o) => !clientId || o.clientId === clientId)
                    .map((o) => <option key={o.id} value={o.id}>{o.orderNumber}</option>)}
                </select>
              )}
            </Field>
          </div>

          <Field id="email-to" label="მიმღები" required>
            {() => <input id="email-to" type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} className={inputClass} />}
          </Field>

          <Field id="email-subject" label="თემა">
            {() => <input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />}
          </Field>

          <Field id="email-body" label="ტექსტი" hint="{{ცვლადები}} ავტომატურად შეივსება არჩეული კლიენტითა და შეკვეთით.">
            {(d) => (
              <textarea id="email-body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} aria-describedby={d} className={`${inputClass} font-mono text-[12px]`} />
            )}
          </Field>

          <button type="button" onClick={handleSend} disabled={sending || !emailConfigured} className={`${primaryButton} w-full inline-flex items-center justify-center gap-2`}>
            <Send className="w-4 h-4" aria-hidden="true" />
            {sending ? 'იგზავნება...' : 'გაგზავნა'}
          </button>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-stone-900 mb-2">გადახედვა</h2>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">თემა</p>
            <p className="mt-0.5 text-sm font-medium text-stone-900">{previewSubject || '—'}</p>
            <hr className="my-3 border-stone-200" />
            <p className="text-[13px] text-stone-800 leading-relaxed whitespace-pre-line">
              {previewBody || 'ტექსტი ცარიელია'}
            </p>
          </div>

          {unresolved.length > 0 && (
            <p role="status" className="mt-2 text-[11px] text-amber-800">
              შეუვსებელი ცვლადები: {unresolved.map((v) => `{{${v}}}`).join(', ')} — აირჩიეთ კლიენტი/შეკვეთა ან ჩაწერეთ ხელით.
            </p>
          )}

          <h2 className="text-sm font-semibold text-stone-900 mt-6 mb-2">გაგზავნილი</h2>
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            {logs === null ? (
              <LoadingState />
            ) : logs.length === 0 ? (
              <EmptyState title="ჯერ არაფერი გაგზავნილა" />
            ) : (
              <ul className="divide-y divide-stone-100 max-h-72 overflow-y-auto">
                {logs.slice(0, 40).map((log) => (
                  <li key={log.id} className="px-4 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-stone-900 truncate">{log.subject || '—'}</p>
                        <p className="text-[11px] text-stone-600 truncate">
                          <Mail className="w-3 h-3 inline-block mr-1 -mt-0.5" aria-hidden="true" />
                          {log.recipient} · {formatDateTime(log.sentAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                          log.status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {log.status === 'SENT' ? 'გაიგზავნა' : 'ვერ გაიგზავნა'}
                      </span>
                    </div>
                    {log.error && <p className="mt-1 text-[11px] text-rose-700">{log.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
      )}

      <ConfirmDialog
        isOpen={deleting !== null}
        title="თარგის წაშლა"
        message={`„${deleting?.label}“ წაიშლება. უკვე გაგზავნილ წერილებს ეს არ შეეხება.`}
        confirmLabel="წაშლა"
        onConfirm={removeTemplate}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

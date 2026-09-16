import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Eye, EyeOff, Image as ImageIcon, Search, Trash2 } from 'lucide-react';
import type { GuestMessage, FontStyle } from '../../types.ts';
import type { Client } from '../../domain/models.ts';
import { guestbookService, type AdminBook } from '../../services/guestbookService.ts';
import { clientService } from '../../services/clientService.ts';
import { matchesSearch } from '../../services/firestoreHelpers.ts';
import { formatDateShort, formatDateTime } from '../../domain/dates.ts';
import { THEME_PRESETS, FONT_OPTIONS } from '../../lib/theme.ts';
import { useSession } from '../../lib/session.tsx';
import { publicGuestBookUrl } from '../../lib/urls.ts';
import { Card, CardHeader, PageHeader, Pill, StatTile } from '../../components/ui/Card.tsx';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

type Filter = 'ALL' | 'APPROVED' | 'PENDING' | 'HIDDEN';

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'დამტკიცებული',
  PENDING: 'მოლოდინში',
  HIDDEN: 'დამალული',
};

const STATUS_TONE: Record<string, string> = {
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-900 border-amber-300',
  HIDDEN: 'bg-stone-100 text-stone-700 border-stone-300',
};

export const GuestbooksPage: React.FC = () => {
  const { user, can } = useSession();
  const toast = useToast();

  const [books, setBooks] = useState<AdminBook[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState<AdminBook | null>(null);
  const [messages, setMessages] = useState<GuestMessage[] | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [removing, setRemoving] = useState<GuestMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingDesign, setSavingDesign] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bookList, clientList] = await Promise.all([
        guestbookService.list(),
        clientService.list().catch(() => []),
      ]);
      setBooks(bookList);
      setClients(clientList);
    } catch (err) {
      console.error('guestbooks load failed', err);
      setError('სტუმრების წიგნების ჩატვირთვა ვერ მოხერხდა');
      setBooks([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openBook = async (book: AdminBook) => {
    setOpen(book);
    setMessages(null);
    setFilter('ALL');
    try {
      setMessages(await guestbookService.listMessagesForBook(book, user?.id || ''));
    } catch (err) {
      console.error('messages load failed', err);
      setMessages([]);
      toast.error('ჩანაწერების ჩატვირთვა ვერ მოხერხდა');
    }
  };

  const setStatus = async (message: GuestMessage, status: 'APPROVED' | 'PENDING' | 'HIDDEN') => {
    try {
      await guestbookService.setMessageStatus(message.id, status);
      setMessages((prev) => (prev || []).map((m) => (m.id === message.id ? { ...m, status } : m)));
      toast.success(STATUS_LABELS[status]);
    } catch (err) {
      console.error('status change failed', err);
      toast.error('სტატუსის შეცვლა ვერ მოხერხდა');
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await guestbookService.deleteMessage(removing.id);
      setMessages((prev) => (prev || []).filter((m) => m.id !== removing.id));
      toast.success('ჩანაწერი წაიშალა');
      setRemoving(null);
    } catch (err) {
      console.error('message delete failed', err);
      toast.error('წაშლა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  const saveBook = async (patch: Partial<AdminBook>) => {
    if (!open) return;
    setSavingDesign(true);
    try {
      await guestbookService.update(open.id, patch);
      setOpen({ ...open, ...patch });
      toast.success('შენახულია');
      await load();
    } catch (err) {
      console.error('book save failed', err);
      toast.error('შენახვა ვერ მოხერხდა');
    } finally {
      setSavingDesign(false);
    }
  };

  const clientName = (id?: string) => clients.find((c) => c.id === id)?.displayName || '—';
  const visible = (books || []).filter((b) => matchesSearch(b, ['title', 'slug', 'hostNames'], search));
  const shown = (messages || []).filter((m) => filter === 'ALL' || m.status === filter);

  /* ---------------- one book ---------------- */
  if (open) {
    const pending = (messages || []).filter((m) => m.status === 'PENDING').length;
    const photos = (messages || []).reduce((n, m) => n + (m.media?.length || 0), 0);

    return (
      <div className="p-6 lg:p-8">
        <PageHeader
          back={{ label: 'სტუმრების წიგნები', onClick: () => setOpen(null) }}
          title={open.title}
          subtitle={`${clientName(open.clientId)} · ${formatDateShort(open.eventDate)}`}
          action={
            <a href={publicGuestBookUrl(open.slug)} target="_blank" rel="noopener noreferrer" className={`${secondaryButton} inline-flex items-center gap-1.5`}>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              საჯარო გვერდი
            </a>
          }
        />

        <div className="grid gap-3 sm:grid-cols-4 mb-6">
          <StatTile label="ჩანაწერები" value={String(messages?.length ?? 0)} />
          <StatTile label="მოლოდინში" value={String(pending)} tone={pending > 0 ? 'warning' : 'default'} />
          <StatTile label="ფოტო/ვიდეო" value={String(photos)} />
          <StatTile label="ნახვები" value={String(open.viewsTotal ?? 0)} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(['ALL', 'PENDING', 'APPROVED', 'HIDDEN'] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors ${
                    filter === f ? 'bg-stone-900 text-white' : 'bg-white border border-stone-300 text-stone-800 hover:bg-stone-100'
                  }`}
                >
                  {f === 'ALL' ? 'ყველა' : STATUS_LABELS[f]}
                </button>
              ))}
            </div>

            <Card padded={false} className="overflow-hidden">
              {messages === null ? (
                <LoadingState />
              ) : shown.length === 0 ? (
                <EmptyState title="ჩანაწერი არ არის" hint="სტუმრებმა QR კოდით რომ დაწერონ, ბმული გაუზიარეთ." />
              ) : (
                <ul className="divide-y divide-stone-100">
                  {shown.map((message) => (
                    <li key={message.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-stone-900">
                            {message.name}
                            {message.relationship && <span className="ml-2 font-normal text-stone-600">{message.relationship}</span>}
                          </p>
                          <p className="text-[11px] text-stone-600">{formatDateTime(message.createdAt)}</p>
                          <p className="mt-2 text-[14px] text-stone-800 leading-relaxed whitespace-pre-line font-serif">
                            {message.message}
                          </p>

                          {(message.media?.length ?? 0) > 0 && (
                            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-stone-600">
                              <ImageIcon className="w-3 h-3" aria-hidden="true" />
                              {message.media!.length} ფაილი
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Pill className={STATUS_TONE[message.status]}>{STATUS_LABELS[message.status]}</Pill>

                          {can('guestbooks.manage') && (
                            <div className="flex gap-1">
                              {message.status !== 'APPROVED' && (
                                <button type="button" onClick={() => setStatus(message, 'APPROVED')} aria-label="დამტკიცება" className="p-1.5 rounded-lg text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer">
                                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              )}
                              {message.status !== 'HIDDEN' ? (
                                <button type="button" onClick={() => setStatus(message, 'HIDDEN')} aria-label="დამალვა" className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer">
                                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              ) : (
                                <button type="button" onClick={() => setStatus(message, 'APPROVED')} aria-label="გამოჩენა" className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer">
                                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              )}
                              <button type="button" onClick={() => setRemoving(message)} aria-label="წაშლა" className="p-1.5 rounded-lg text-stone-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <aside className="space-y-5">
            <Card>
              <CardHeader title="ტექსტები" />
              <div className="space-y-3">
                <Field id="gb-title" label="დასახელება">
                  {() => <input id="gb-title" defaultValue={open.title} onBlur={(e) => e.target.value !== open.title && saveBook({ title: e.target.value })} className={inputClass} />}
                </Field>
                <Field id="gb-hosts" label="მასპინძლები">
                  {() => <input id="gb-hosts" defaultValue={open.hostNames} onBlur={(e) => e.target.value !== open.hostNames && saveBook({ hostNames: e.target.value })} className={inputClass} />}
                </Field>
                <Field id="gb-welcome" label="მისალმება">
                  {() => <textarea id="gb-welcome" rows={3} defaultValue={open.welcomeMessage} onBlur={(e) => e.target.value !== open.welcomeMessage && saveBook({ welcomeMessage: e.target.value })} className={`${inputClass} resize-none`} />}
                </Field>
                <p className="text-[11px] text-stone-600">ცვლილება ინახება ველიდან გასვლისას.</p>
              </div>
            </Card>

            <Card>
              <CardHeader title="მოდერაცია" />
              <label htmlFor="gb-moderated" className="flex items-start gap-2.5 text-[13px] text-stone-800 cursor-pointer">
                <input
                  id="gb-moderated"
                  type="checkbox"
                  checked={open.isModerated}
                  onChange={(e) => saveBook({ isModerated: e.target.checked })}
                  disabled={savingDesign}
                  className="mt-0.5 w-4 h-4 rounded border-stone-400 text-stone-900 cursor-pointer"
                />
                <span>
                  წინასწარი დამტკიცება
                  <span className="block text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                    ჩართვისას ახალი ჩანაწერი მოლოდინში ჩადგება და საჯაროდ მხოლოდ
                    თქვენი დამტკიცების შემდეგ გამოჩნდება.
                  </span>
                </span>
              </label>
            </Card>

            <Card>
              <CardHeader title="თემა" />
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {Object.values(THEME_PRESETS).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => saveBook({ theme: { ...open.theme, ...preset.settings } })}
                    aria-pressed={open.theme?.themePreset === preset.id}
                    className={`px-2.5 py-2 rounded-xl text-[12px] font-semibold cursor-pointer transition-colors border ${
                      open.theme?.themePreset === preset.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: preset.previewPrimary }} />
                    {preset.name}
                  </button>
                ))}
              </div>

              <Field id="gb-font" label="შრიფტი">
                {() => (
                  <select
                    id="gb-font"
                    value={open.theme?.fontStyle || 'serif'}
                    onChange={(e) => saveBook({ theme: { ...open.theme, fontStyle: e.target.value as FontStyle } })}
                    className={inputClass}
                  >
                    {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.nameKa}</option>)}
                  </select>
                )}
              </Field>
            </Card>
          </aside>
        </div>

        <ConfirmDialog
          isOpen={removing !== null}
          title="ჩანაწერის წაშლა"
          message={`„${removing?.name}“-ის ჩანაწერი სამუდამოდ წაიშლება. თუ მხოლოდ დამალვა გსურთ, გამოიყენეთ დამალვის ღილაკი.`}
          confirmLabel="წაშლა"
          busy={busy}
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        />
      </div>
    );
  }

  /* ---------------- list ---------------- */
  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="სტუმრების წიგნები"
        subtitle={books === null ? 'იტვირთება...' : `${books.length} წიგნი`}
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძებნა დასახელებით ან მასპინძლით"
          aria-label="სტუმრების წიგნების ძებნა"
          className={`${inputClass} pl-9`}
        />
      </div>

      <Card padded={false} className="overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : books === null ? (
          <LoadingState />
        ) : visible.length === 0 ? (
          <EmptyState
            title="სტუმრების წიგნი ჯერ არ არის"
            hint="წიგნი იქმნება ღონისძიების შექმნისას — მონიშნეთ „სტუმრების წიგნი“."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">წიგნი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">კლიენტი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">თარიღი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">მოდერაცია</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">ნახვები</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((book) => (
                  <tr key={book.id} onClick={() => openBook(book)} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60 cursor-pointer">
                    <td className="px-4 py-3">
                      <span className="block font-medium text-stone-900">{book.title}</span>
                      <span className="block font-mono text-[11px] text-stone-600">{book.slug}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-700">{clientName(book.clientId)}</td>
                    <td className="px-4 py-3 text-stone-700 whitespace-nowrap">{formatDateShort(book.eventDate)}</td>
                    <td className="px-4 py-3">
                      <Pill className={book.isModerated ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}>
                        {book.isModerated ? 'დამტკიცებით' : 'პირდაპირ'}
                      </Pill>
                    </td>
                    <td className="px-4 py-3 text-stone-700">{book.viewsTotal ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

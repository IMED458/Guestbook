import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookHeart, Copy, ExternalLink, Images, Plus, Search } from 'lucide-react';
import type { Client, EventRecord, EventType } from '../../domain/models.ts';
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from '../../domain/labels.ts';
import { formatDateShort, toDateInputValue } from '../../domain/dates.ts';
import { eventService, type EventInput } from '../../services/eventService.ts';
import { clientService } from '../../services/clientService.ts';
import { activityService } from '../../services/systemService.ts';
import { matchesSearch } from '../../services/firestoreHelpers.ts';
import { useSession } from '../../lib/session.tsx';
import { publicAlbumUrl, publicEventUrl, publicGuestBookUrl } from '../../lib/urls.ts';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { Modal, primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

const emptyForm = {
  clientId: '',
  title: '',
  eventType: 'wedding' as EventType,
  eventDate: toDateInputValue(new Date()),
  hosts: '',
  venue: '',
  hasGuestbook: true,
  hasAlbum: true,
};

export const EventsPage: React.FC = () => {
  const { user, can } = useSession();
  const toast = useToast();

  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [sharing, setSharing] = useState<EventRecord | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [eventList, clientList] = await Promise.all([eventService.list(), clientService.list()]);
      setEvents(eventList);
      setClients(clientList);
    } catch (err) {
      console.error('events load failed', err);
      setError('ღონისძიებების ჩატვირთვა ვერ მოხერხდა');
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (events || []).filter((e) => matchesSearch(e, ['title', 'hosts', 'venue'], search)),
    [events, search]
  );

  const clientName = (id: string) => clients.find((c) => c.id === id)?.displayName || '—';

  const handleSave = async () => {
    if (!form.clientId) {
      setFormError('აირჩიეთ კლიენტი');
      return;
    }
    if (!form.title.trim()) {
      setFormError('ღონისძიების დასახელება სავალდებულოა');
      return;
    }
    if (!form.hasGuestbook && !form.hasAlbum) {
      setFormError('აირჩიეთ მინიმუმ ერთი სერვისი — სტუმრების წიგნი ან ციფრული ალბომი');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const created = await eventService.create(form as EventInput, user?.id || '');
      void activityService.record({
        actorUserId: user?.id || '',
        actorName: `${user?.firstName} ${user?.lastName}`.trim() || user?.username || '',
        action: 'event.created',
        entityType: 'event',
        entityId: created.id,
        metadata: { title: created.title, guestbook: created.hasGuestbook, album: created.hasAlbum },
      });
      toast.success('ღონისძიება შეიქმნა');
      setFormOpen(false);
      await load();
      setSharing(created);
    } catch (err) {
      console.error('event save failed', err);
      setFormError('შენახვა ვერ მოხერხდა — შეამოწმეთ უფლებები');
    } finally {
      setSaving(false);
    }
  };

  const copy = (label: string, value: string) => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} დაკოპირდა`);
  };

  return (
    <div className="p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">ღონისძიებები</h1>
          <p className="mt-1 text-sm text-stone-600">
            {events === null ? 'იტვირთება...' : `${events.length} ღონისძიება`}
          </p>
        </div>
        {can('events.manage') && (
          <button
            type="button"
            onClick={() => {
              setForm({ ...emptyForm, clientId: clients[0]?.id || '' });
              setFormError(null);
              setFormOpen(true);
            }}
            disabled={clients.length === 0}
            className={`${primaryButton} inline-flex items-center gap-2`}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            ახალი ღონისძიება
          </button>
        )}
      </header>

      <div className="mb-4 relative max-w-sm">
        <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძებნა დასახელებით ან მასპინძლით"
          aria-label="ღონისძიებების ძებნა"
          className={`${inputClass} pl-9`}
        />
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : events === null ? (
          <LoadingState />
        ) : visible.length === 0 ? (
          <EmptyState
            title={search ? 'ვერაფერი მოიძებნა' : 'ღონისძიება ჯერ არ შექმნილა'}
            hint={
              clients.length === 0
                ? 'ჯერ დაამატეთ კლიენტი — ღონისძიება ყოველთვის კლიენტს ეკუთვნის.'
                : 'შექმენით ღონისძიება და აირჩიეთ, სტუმრების წიგნი სჭირდება, ალბომი თუ ორივე.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">ღონისძიება</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">კლიენტი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">თარიღი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">სერვისები</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700 text-right">ბმულები</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((event) => (
                  <tr key={event.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                    <td className="px-4 py-3">
                      <span className="block font-medium text-stone-900">{event.title}</span>
                      <span className="block text-[11px] text-stone-600">
                        {EVENT_TYPE_LABELS[event.eventType]} · {EVENT_STATUS_LABELS[event.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-700">{clientName(event.clientId)}</td>
                    <td className="px-4 py-3 text-stone-700 whitespace-nowrap">{formatDateShort(event.eventDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {event.hasGuestbook && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-800">
                            <BookHeart className="w-3 h-3" aria-hidden="true" />
                            წიგნი
                          </span>
                        )}
                        {event.hasAlbum && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-[11px] font-semibold text-indigo-800">
                            <Images className="w-3 h-3" aria-hidden="true" />
                            ალბომი
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setSharing(event)} className={secondaryButton}>
                        ბმულები და QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={formOpen}
        title="ახალი ღონისძიება"
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setFormOpen(false)} disabled={saving}>
              გაუქმება
            </button>
            <button type="button" className={primaryButton} onClick={handleSave} disabled={saving}>
              {saving ? 'იქმნება...' : 'შექმნა'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-[13px] font-medium text-rose-800">
              {formError}
            </div>
          )}

          <Field id="event-client" label="კლიენტი" required>
            {() => (
              <select id="event-client" value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))} className={inputClass}>
                <option value="">— აირჩიეთ —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
              </select>
            )}
          </Field>

          <Field id="event-title" label="დასახელება" required hint="ეს გამოჩნდება საჯარო გვერდზე და QR ბარათზე.">
            {(d) => (
              <input id="event-title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} aria-describedby={d} placeholder="ნიკა & ანას ქორწილი" className={inputClass} />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="event-type" label="ტიპი" required>
              {() => (
                <select id="event-type" value={form.eventType} onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value as EventType }))} className={inputClass}>
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
                </select>
              )}
            </Field>
            <Field id="event-date" label="თარიღი" required>
              {() => <input id="event-date" type="date" value={form.eventDate} onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))} className={inputClass} />}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="event-hosts" label="მასპინძლები">
              {() => <input id="event-hosts" value={form.hosts} onChange={(e) => setForm((p) => ({ ...p, hosts: e.target.value }))} placeholder="ნიკა და ანა" className={inputClass} />}
            </Field>
            <Field id="event-venue" label="ადგილი">
              {() => <input id="event-venue" value={form.venue} onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))} className={inputClass} />}
            </Field>
          </div>

          <fieldset className="rounded-lg border border-stone-200 p-4">
            <legend className="px-1.5 text-[13px] font-semibold text-stone-800">სერვისები</legend>
            <p className="text-[11px] text-stone-600 mb-2.5 leading-relaxed">
              სტუმრების წიგნი და ციფრული ალბომი ცალკე პროდუქტებია — კლიენტს შეიძლება
              ერთი უნდოდეს, მეორე, ან ორივე.
            </p>
            <div className="space-y-2">
              <label htmlFor="event-guestbook" className="flex items-center gap-2.5 text-[13px] text-stone-800 cursor-pointer">
                <input id="event-guestbook" type="checkbox" checked={form.hasGuestbook} onChange={(e) => setForm((p) => ({ ...p, hasGuestbook: e.target.checked }))} className="w-4 h-4 rounded border-stone-400 text-stone-900 cursor-pointer" />
                <BookHeart className="w-4 h-4 text-rose-600" aria-hidden="true" />
                სტუმრების წიგნი
              </label>
              <label htmlFor="event-album" className="flex items-center gap-2.5 text-[13px] text-stone-800 cursor-pointer">
                <input id="event-album" type="checkbox" checked={form.hasAlbum} onChange={(e) => setForm((p) => ({ ...p, hasAlbum: e.target.checked }))} className="w-4 h-4 rounded border-stone-400 text-stone-900 cursor-pointer" />
                <Images className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                ციფრული ალბომი
              </label>
            </div>
          </fieldset>
        </div>
      </Modal>

      {/* Everything the client needs, on one screen. */}
      <Modal
        isOpen={sharing !== null}
        title="ბმულები და QR კოდები"
        onClose={() => setSharing(null)}
        footer={
          <button type="button" className={primaryButton} onClick={() => setSharing(null)}>
            დახურვა
          </button>
        }
      >
        {sharing && (
          <div className="space-y-3">
            <p className="text-[13px] text-stone-700 leading-relaxed">
              <strong className="font-semibold">{sharing.title}</strong> — ეს ბმულები სტუმრებს
              ავტორიზაციის გარეშე ეხსნებათ.
            </p>

            {[
              sharing.hasGuestbook && { label: 'სტუმრების წიგნი', url: publicGuestBookUrl(sharing.slug) },
              sharing.hasAlbum && { label: 'ციფრული ალბომი', url: publicAlbumUrl(sharing.slug) },
              sharing.hasGuestbook && sharing.hasAlbum && { label: 'საერთო გვერდი', url: publicEventUrl(sharing.slug) },
            ]
              .filter((x): x is { label: string; url: string } => Boolean(x))
              .map((link) => (
                <div key={link.label} className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">{link.label}</p>
                  <p className="mt-1 font-mono text-[12px] text-stone-900 break-all">{link.url}</p>
                  <div className="mt-2.5 flex gap-2">
                    <button type="button" onClick={() => copy(link.label, link.url)} className={`${secondaryButton} inline-flex items-center gap-1.5 !py-1.5`}>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      კოპირება
                    </button>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className={`${secondaryButton} inline-flex items-center gap-1.5 !py-1.5`}>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      გახსნა
                    </a>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

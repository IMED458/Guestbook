import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Building2, Pencil, Phone, Plus, Search } from 'lucide-react';
import type { Client } from '../../domain/models.ts';
import { clientService, type ClientInput } from '../../services/clientService.ts';
import { matchesSearch } from '../../services/firestoreHelpers.ts';
import { formatDateShort } from '../../domain/dates.ts';
import { useSession } from '../../lib/session.tsx';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { Modal, primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import { CredentialsModal } from '../../components/admin/CredentialsModal.tsx';
import { userService } from '../../services/userService.ts';
import { generateTemporaryPassword, normalizeUsername, validateUsername } from '../../domain/username.ts';
import { NO_CLIENT_ACCESS } from '../../domain/roles.ts';
import { navigate } from '../../lib/routes.ts';

const emptyForm: ClientInput = {
  displayName: '',
  firstName: '',
  lastName: '',
  companyName: '',
  phone: '',
  secondaryPhone: '',
  email: '',
  address: '',
  notes: '',
};

export const ClientsPage: React.FC = () => {
  const { user, can } = useSession();
  const toast = useToast();

  const [clients, setClients] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState<Client | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [archiving, setArchiving] = useState<Client | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  // Creating a login alongside the client is offered, never forced. A client
  // who only ordered printed invitations has no reason to sign in; one who is
  // getting a guest book or an album does.
  const [withLogin, setWithLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setClients(await clientService.list());
    } catch (err) {
      console.error('clients load failed', err);
      setError('კლიენტების ჩატვირთვა ვერ მოხერხდა');
      setClients([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () =>
      (clients || []).filter((c) =>
        matchesSearch(c, ['displayName', 'companyName', 'phone', 'email'], search)
      ),
    [clients, search]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setWithLogin(false);
    setUsername('');
    setPassword(generateTemporaryPassword());
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      displayName: client.displayName,
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      companyName: client.companyName || '',
      phone: client.phone || '',
      secondaryPhone: client.secondaryPhone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      setFormError('სახელწოდება სავალდებულოა');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await clientService.update(editing.id, form);
        toast.success('კლიენტი განახლდა');
      } else {
        const created = await clientService.create(form, user?.id || '');

        if (withLogin) {
          const normalized = normalizeUsername(username);
          const check = validateUsername(normalized);
          if (!check.valid) {
            // The client is saved; only the login failed, so say exactly that.
            setFormError('კლიენტი შეიქმნა, მაგრამ მომხმარებელი ვერ — სახელი უნდა იწყებოდეს ლათინური ასოთი (3-32 სიმბოლო)');
            await load();
            setSaving(false);
            return;
          }

          await userService.create(
            {
              username: normalized,
              firstName: form.firstName?.trim() || form.displayName,
              lastName: form.lastName?.trim() || '',
              companyName: form.companyName,
              contactEmail: form.email,
              phone: form.phone,
              role: 'CLIENT',
              permissions: [],
              clientId: created.id,
              access: { ...NO_CLIENT_ACCESS, orders: true, payments: true },
              mustChangePassword: true,
            },
            password
          );
          setCredentials({ username: normalized, password });
        }

        toast.success(withLogin ? 'კლიენტი და მომხმარებელი შეიქმნა' : 'კლიენტი დაემატა');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      console.error('client save failed', err);
      setFormError('შენახვა ვერ მოხერხდა — შეამოწმეთ უფლებები');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiving) return;
    setArchiveBusy(true);
    try {
      await clientService.archive(archiving.id);
      toast.success('კლიენტი დაარქივდა');
      setArchiving(null);
      await load();
    } catch (err) {
      console.error('client archive failed', err);
      toast.error('დაარქივება ვერ მოხერხდა');
    } finally {
      setArchiveBusy(false);
    }
  };

  const set = (key: keyof ClientInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const suggestUsername = () => {
    const suggestion = normalizeUsername(
      (form.displayName || '').replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).join('.')
    );
    if (/^[a-z]/.test(suggestion)) setUsername(suggestion.slice(0, 32));
  };

  return (
    <div className="p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">კლიენტები</h1>
          <p className="mt-1 text-sm text-stone-600">
            {clients === null ? 'იტვირთება...' : `${clients.length} აქტიური კლიენტი`}
          </p>
        </div>

        {can('clients.create') && (
          <button type="button" onClick={openCreate} className={`${primaryButton} inline-flex items-center gap-2`}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            ახალი კლიენტი
          </button>
        )}
      </header>

      <div className="mb-4 relative max-w-sm">
        <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძებნა სახელით, ტელეფონით, ელფოსტით"
          aria-label="კლიენტების ძებნა"
          className={`${inputClass} pl-9`}
        />
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : clients === null ? (
          <LoadingState />
        ) : visible.length === 0 ? (
          <EmptyState
            title={search ? 'ვერაფერი მოიძებნა' : 'კლიენტები ჯერ არ დამატებულა'}
            hint={search ? 'სცადეთ სხვა საძიებო სიტყვა.' : 'დაამატეთ პირველი კლიენტი, რომ შეკვეთების და ღონისძიებების შექმნა შეძლოთ.'}
            action={
              !search && can('clients.create') ? (
                <button type="button" onClick={openCreate} className={primaryButton}>
                  ახალი კლიენტი
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">კლიენტი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">კონტაქტი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">დამატების თარიღი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700 text-right">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => navigate('admin/clients/:id', { id: client.id })}
                    className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="block font-medium text-stone-900">{client.displayName}</span>
                      {client.companyName && (
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-600">
                          <Building2 className="w-3 h-3" aria-hidden="true" />
                          {client.companyName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-500" aria-hidden="true" />
                          {client.phone}
                        </span>
                      )}
                      {client.email && <span className="block text-[11px] text-stone-600">{client.email}</span>}
                      {!client.phone && !client.email && <span className="text-stone-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-stone-700 whitespace-nowrap">
                      {formatDateShort(client.createdAt)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {can('clients.edit') && (
                          <button
                            type="button"
                            onClick={() => openEdit(client)}
                            aria-label={`${client.displayName} — რედაქტირება`}
                            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {can('clients.delete') && (
                          <button
                            type="button"
                            onClick={() => setArchiving(client)}
                            aria-label={`${client.displayName} — დაარქივება`}
                            className="p-1.5 rounded-lg text-stone-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
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
        title={editing ? 'კლიენტის რედაქტირება' : 'ახალი კლიენტი'}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setFormOpen(false)} disabled={saving}>
              გაუქმება
            </button>
            <button type="button" className={primaryButton} onClick={handleSave} disabled={saving}>
              {saving ? 'ინახება...' : 'შენახვა'}
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

          <Field id="client-name" label="სახელწოდება" required hint="ასე გამოჩნდება სიებში და შეკვეთებში.">
            {(describedBy) => (
              <input id="client-name" value={form.displayName} onChange={set('displayName')} aria-describedby={describedBy} className={inputClass} />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="client-first" label="სახელი">
              {() => <input id="client-first" value={form.firstName} onChange={set('firstName')} className={inputClass} />}
            </Field>
            <Field id="client-last" label="გვარი">
              {() => <input id="client-last" value={form.lastName} onChange={set('lastName')} className={inputClass} />}
            </Field>
          </div>

          <Field id="client-company" label="კომპანია">
            {() => <input id="client-company" value={form.companyName} onChange={set('companyName')} className={inputClass} />}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="client-phone" label="ტელეფონი">
              {() => <input id="client-phone" type="tel" value={form.phone} onChange={set('phone')} className={inputClass} />}
            </Field>
            <Field id="client-phone2" label="დამატებითი ტელეფონი">
              {() => <input id="client-phone2" type="tel" value={form.secondaryPhone} onChange={set('secondaryPhone')} className={inputClass} />}
            </Field>
          </div>

          <Field id="client-email" label="ელფოსტა">
            {() => <input id="client-email" type="email" value={form.email} onChange={set('email')} className={inputClass} />}
          </Field>

          <Field id="client-address" label="მისამართი">
            {() => <input id="client-address" value={form.address} onChange={set('address')} className={inputClass} />}
          </Field>

          <Field id="client-notes" label="შიდა შენიშვნა" hint="კლიენტი ამას ვერ ხედავს.">
            {(describedBy) => (
              <textarea id="client-notes" rows={3} value={form.notes} onChange={set('notes')} aria-describedby={describedBy} className={`${inputClass} resize-none`} />
            )}
          </Field>

          {!editing && can('users.manage') && (
            <fieldset className="rounded-xl border border-stone-200 p-4">
              <legend className="px-1.5 text-[13px] font-semibold text-stone-800">შესვლის ანგარიში</legend>

              <label htmlFor="client-with-login" className="flex items-start gap-2.5 text-[13px] text-stone-800 cursor-pointer">
                <input
                  id="client-with-login"
                  type="checkbox"
                  checked={withLogin}
                  onChange={(e) => {
                    setWithLogin(e.target.checked);
                    if (e.target.checked && !username) suggestUsername();
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-stone-400 text-stone-900 cursor-pointer"
                />
                <span>
                  ანგარიშიც შევქმნა
                  <span className="block text-[11px] text-stone-600 leading-relaxed mt-0.5">
                    არასავალდებულოა. საჭიროა მხოლოდ მაშინ, თუ კლიენტი სტუმრების წიგნს
                    ან ციფრულ ალბომს მიიღებს — ჩვეულებრივი შეკვეთისთვის არა.
                  </span>
                </span>
              </label>

              {withLogin && (
                <div className="mt-3 space-y-3">
                  <Field id="client-username" label="მომხმარებელი" required>
                    {() => (
                      <input id="client-username" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" spellCheck={false} placeholder="nika.maisuradze" className={inputClass} />
                    )}
                  </Field>
                  <Field id="client-password" label="დროებითი პაროლი" required hint="ერთხელ გამოჩნდება შენახვის შემდეგ.">
                    {(d) => (
                      <div className="flex gap-2">
                        <input id="client-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={d} className={`${inputClass} font-mono`} />
                        <button type="button" onClick={() => setPassword(generateTemporaryPassword())} className={secondaryButton}>ახალი</button>
                      </div>
                    )}
                  </Field>
                </div>
              )}
            </fieldset>
          )}
        </div>
      </Modal>

      <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />

      <ConfirmDialog
        isOpen={archiving !== null}
        title="კლიენტის დაარქივება"
        message={`დარწმუნებული ხართ, რომ გსურთ „${archiving?.displayName}“ დაარქივება? მისი შეკვეთები და ღონისძიებები შენარჩუნდება — კლიენტი უბრალოდ აღარ გამოჩნდება სიაში.`}
        confirmLabel="დაარქივება"
        busy={archiveBusy}
        onConfirm={handleArchive}
        onCancel={() => setArchiving(null)}
      />
    </div>
  );
};

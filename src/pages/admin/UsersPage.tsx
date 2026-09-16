import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Pencil, Plus, Search, ShieldCheck, Trash2, UserX } from 'lucide-react';
import type { AppUser, Client } from '../../domain/models.ts';
import type { ClientAccess, Permission, UserRole } from '../../domain/roles.ts';
import { DEFAULT_STAFF_PERMISSIONS, NO_CLIENT_ACCESS, PERMISSIONS, PERMISSION_GROUPS } from '../../domain/roles.ts';
import { generateTemporaryPassword, normalizeUsername, validateUsername } from '../../domain/username.ts';
import { formatDateShort } from '../../domain/dates.ts';
import {
  PERMISSION_GROUP_LABELS,
  PERMISSION_LABELS,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
} from '../../domain/labels.ts';
import { userService, type UserInput } from '../../services/userService.ts';
import { clientService } from '../../services/clientService.ts';
import { matchesSearch } from '../../services/firestoreHelpers.ts';
import { apiConfigured } from '../../services/apiClient.ts';
import { useSession } from '../../lib/session.tsx';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { Modal, primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import { CredentialsModal } from '../../components/admin/CredentialsModal.tsx';
import { QuickEmailModal } from '../../components/admin/QuickEmailModal.tsx';

const USERNAME_HINTS: Record<string, string> = {
  'username.tooShort': 'მინიმუმ 3 სიმბოლო',
  'username.tooLong': 'მაქსიმუმ 32 სიმბოლო',
  'username.invalidChars': 'მხოლოდ ლათინური ასოები, ციფრები, წერტილი, ტირე და ქვედა ტირე',
  'username.startsWithNonLetter': 'უნდა იწყებოდეს ასოთი',
};

const emptyForm = {
  username: '',
  firstName: '',
  lastName: '',
  companyName: '',
  contactEmail: '',
  phone: '',
  role: 'CLIENT' as UserRole,
  permissions: [] as Permission[],
  clientId: '',
  access: { ...NO_CLIENT_ACCESS } as ClientAccess,
  mustChangePassword: true,
};

export const UsersPage: React.FC = () => {
  const { user: me, isSuperAdmin, can } = useSession();
  const toast = useToast();

  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /** Shown once, straight after creation — never stored, never shown again. */
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  /** Which client the shown credentials belong to, so we know where to write. */
  const [credentialsClient, setCredentialsClient] = useState<Client | null>(null);

  const [resetting, setResetting] = useState<AppUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [emailFor, setEmailFor] = useState<{ client: Client; credentials: { username: string; password: string } } | null>(null);
  const [removing, setRemoving] = useState<AppUser | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [userList, clientList] = await Promise.all([userService.list(), clientService.list()]);
      setUsers(userList);
      setClients(clientList);
    } catch (err) {
      console.error('users load failed', err);
      setError('მომხმარებლების ჩატვირთვა ვერ მოხერხდა');
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (users || []).filter((u) => matchesSearch(u, ['username', 'firstName', 'lastName', 'contactEmail'], search)),
    [users, search]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setPassword(generateTemporaryPassword());
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (target: AppUser) => {
    setEditing(target);
    setForm({
      username: target.username,
      firstName: target.firstName,
      lastName: target.lastName,
      companyName: target.companyName || '',
      contactEmail: target.contactEmail || '',
      phone: target.phone || '',
      role: target.role,
      permissions: target.permissions,
      clientId: target.clientId || '',
      access: target.access,
      mustChangePassword: target.mustChangePassword,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    const username = normalizeUsername(form.username);
    const check = validateUsername(username);

    if (!check.valid) {
      setFormError(`მომხმარებელი: ${USERNAME_HINTS[check.reason || ''] || 'არასწორია'}`);
      return;
    }
    if (!form.firstName.trim()) {
      setFormError('სახელი სავალდებულოა');
      return;
    }
    if (form.role === 'CLIENT' && !form.clientId) {
      setFormError('კლიენტის ანგარიშს კლიენტი უნდა მიება');
      return;
    }
    if (!editing && password.length < 6) {
      setFormError('დროებითი პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს');
      return;
    }

    const payload: UserInput = {
      username,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      companyName: form.companyName.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      phone: form.phone.trim() || undefined,
      role: form.role,
      permissions: form.role === 'STAFF' ? form.permissions : [],
      clientId: form.role === 'CLIENT' ? form.clientId : undefined,
      access: form.role === 'CLIENT' ? form.access : NO_CLIENT_ACCESS,
      mustChangePassword: form.mustChangePassword,
    };

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await userService.update(editing.id, payload);
        toast.success('მომხმარებელი განახლდა');
      } else {
        await userService.create(payload, password);
        setCredentials({ username, password });
        setCredentialsClient(clients.find((c) => c.id === payload.clientId) || null);
        toast.success('მომხმარებელი შეიქმნა');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      console.error('user save failed', err);
      setFormError(err instanceof Error ? err.message : 'შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!resetting || resetPassword.length < 6) {
      toast.error('პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს');
      return;
    }
    setBusy(true);
    try {
      await userService.resetPassword(resetting.id, resetPassword);
      setCredentials({ username: resetting.username, password: resetPassword });
      setCredentialsClient(clients.find((c) => c.id === resetting.clientId) || null);
      toast.success('პაროლი შეიცვალა');
      setResetting(null);
      await load();
    } catch (err) {
      console.error('password reset failed', err);
      toast.error(err instanceof Error ? err.message : 'პაროლის შეცვლა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (target: AppUser) => {
    try {
      const next = target.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      await userService.setStatus(target.id, next);
      toast.success(next === 'ACTIVE' ? 'ანგარიში გააქტიურდა' : 'ანგარიში გაითიშა');
      await load();
    } catch (err) {
      console.error('status change failed', err);
      toast.error(err instanceof Error ? err.message : 'ოპერაცია ვერ შესრულდა');
    }
  };

  const handleRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await userService.remove(removing.id);
      toast.success('მომხმარებელი წაიშალა');
      setRemoving(null);
      await load();
    } catch (err) {
      console.error('user delete failed', err);
      toast.error(err instanceof Error ? err.message : 'წაშლა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  const togglePermission = (permission: Permission) =>
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));

  if (!apiConfigured) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-semibold text-stone-900">მომხმარებლები</h1>
        <div className="mt-5 max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-sm text-amber-900 leading-relaxed">
            მომხმარებლების შექმნა სერვერულ API-ს საჭიროებს. შეავსეთ{' '}
            <code className="font-mono text-[12px]">VITE_API_BASE_URL</code> და გადატვირთეთ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">მომხმარებლები</h1>
          <p className="mt-1 text-sm text-stone-600">
            {users === null ? 'იტვირთება...' : `${users.length} ანგარიში`}
          </p>
        </div>
        {can('users.manage') && (
          <button type="button" onClick={openCreate} className={`${primaryButton} inline-flex items-center gap-2`}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            ახალი მომხმარებელი
          </button>
        )}
      </header>

      <div className="mb-4 relative max-w-sm">
        <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძებნა მომხმარებლით ან სახელით"
          aria-label="მომხმარებლების ძებნა"
          className={`${inputClass} pl-9`}
        />
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : users === null ? (
          <LoadingState />
        ) : visible.length === 0 ? (
          <EmptyState title={search ? 'ვერაფერი მოიძებნა' : 'მომხმარებლები არ არის'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">მომხმარებელი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">როლი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">კლიენტი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">სტატუსი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">შექმნილი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700 text-right">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                    <td className="px-4 py-3">
                      <span className="block font-medium text-stone-900">{row.username}</span>
                      <span className="block text-[11px] text-stone-600">
                        {`${row.firstName} ${row.lastName}`.trim() || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      <span className="inline-flex items-center gap-1.5">
                        {row.role === 'SUPER_ADMIN' && <ShieldCheck className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />}
                        {USER_ROLE_LABELS[row.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {clients.find((c) => c.id === row.clientId)?.displayName || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                          row.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-stone-100 text-stone-700 border-stone-300'
                        }`}
                      >
                        {USER_STATUS_LABELS[row.status]}
                      </span>
                      {row.mustChangePassword && (
                        <span className="mt-1 block text-[10px] text-amber-800">პაროლის შეცვლა სჭირდება</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-700 whitespace-nowrap">{formatDateShort(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {can('users.manage') && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              aria-label={`${row.username} — რედაქტირება`}
                              className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResetting(row);
                                setResetPassword(generateTemporaryPassword());
                              }}
                              aria-label={`${row.username} — პაროლის შეცვლა`}
                              className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </>
                        )}
                        {isSuperAdmin && row.id !== me?.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleStatus(row)}
                              aria-label={`${row.username} — ${row.status === 'ACTIVE' ? 'გათიშვა' : 'გააქტიურება'}`}
                              className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemoving(row)}
                              aria-label={`${row.username} — წაშლა`}
                              className="p-1.5 rounded-lg text-stone-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </>
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

      {/* Create / edit ------------------------------------------------- */}
      <Modal
        isOpen={formOpen}
        title={editing ? 'მომხმარებლის რედაქტირება' : 'ახალი მომხმარებელი'}
        onClose={() => setFormOpen(false)}
        size="lg"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="user-username" label="მომხმარებელი" required hint="ლათინურად, ასოთი იწყება. ასე შედის სისტემაში.">
              {(d) => (
                <input
                  id="user-username"
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-describedby={d}
                  placeholder="imedo"
                  className={inputClass}
                />
              )}
            </Field>

            <Field id="user-role" label="როლი" required>
              {() => (
                <select
                  id="user-role"
                  value={form.role}
                  onChange={(e) => {
                    const role = e.target.value as UserRole;
                    setForm((p) => ({
                      ...p,
                      role,
                      permissions: role === 'STAFF' ? DEFAULT_STAFF_PERMISSIONS : [],
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="CLIENT">{USER_ROLE_LABELS.CLIENT}</option>
                  <option value="STAFF">{USER_ROLE_LABELS.STAFF}</option>
                  {isSuperAdmin && <option value="SUPER_ADMIN">{USER_ROLE_LABELS.SUPER_ADMIN}</option>}
                </select>
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="user-first" label="სახელი" required>
              {() => <input id="user-first" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} className={inputClass} />}
            </Field>
            <Field id="user-last" label="გვარი">
              {() => <input id="user-last" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} className={inputClass} />}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="user-email" label="საკონტაქტო ელფოსტა" hint="აქ იგზავნება შეტყობინებები. სისტემაში შესვლა მომხმარებლით ხდება.">
              {(d) => <input id="user-email" type="email" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} aria-describedby={d} className={inputClass} />}
            </Field>
            <Field id="user-phone" label="ტელეფონი">
              {() => <input id="user-phone" type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={inputClass} />}
            </Field>
          </div>

          {!editing && (
            <Field id="user-password" label="დროებითი პაროლი" required hint="ერთხელ გამოჩნდება შენახვის შემდეგ. პირველ შესვლაზე შეცვლა მოეთხოვება.">
              {(d) => (
                <div className="flex gap-2">
                  <input id="user-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={d} className={`${inputClass} font-mono`} />
                  <button type="button" onClick={() => setPassword(generateTemporaryPassword())} className={secondaryButton}>
                    ახალი
                  </button>
                </div>
              )}
            </Field>
          )}

          {form.role === 'CLIENT' && (
            <>
              <Field id="user-client" label="კლიენტი" required hint="ეს ანგარიში მხოლოდ ამ კლიენტის მონაცემებს დაინახავს.">
                {(d) => (
                  <select id="user-client" value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))} aria-describedby={d} className={inputClass}>
                    <option value="">— აირჩიეთ —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.displayName}</option>
                    ))}
                  </select>
                )}
              </Field>

              <fieldset className="rounded-lg border border-stone-200 p-4">
                <legend className="px-1.5 text-[13px] font-semibold text-stone-800">რას ხედავს კლიენტი</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    ['guestbook', 'სტუმრების წიგნი'],
                    ['album', 'ციფრული ალბომი'],
                    ['orders', 'შეკვეთები'],
                    ['payments', 'გადახდები'],
                  ] as [keyof ClientAccess, string][]).map(([key, label]) => (
                    <label key={key} htmlFor={`access-${key}`} className="flex items-center gap-2 text-[13px] text-stone-800 cursor-pointer">
                      <input
                        id={`access-${key}`}
                        type="checkbox"
                        checked={form.access[key]}
                        onChange={(e) => setForm((p) => ({ ...p, access: { ...p.access, [key]: e.target.checked } }))}
                        className="w-4 h-4 rounded border-stone-400 text-stone-900 cursor-pointer"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {form.role === 'STAFF' && (
            <fieldset className="rounded-lg border border-stone-200 p-4">
              <legend className="px-1.5 text-[13px] font-semibold text-stone-800">უფლებები</legend>
              <div className="space-y-3">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.id}>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-stone-600 mb-1.5">
                      {PERMISSION_GROUP_LABELS[group.id] || group.id}
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {group.permissions.map((permission) => (
                        <label key={permission} htmlFor={`perm-${permission}`} className="flex items-center gap-2 text-[13px] text-stone-800 cursor-pointer">
                          <input
                            id={`perm-${permission}`}
                            type="checkbox"
                            checked={form.permissions.includes(permission)}
                            onChange={() => togglePermission(permission)}
                            className="w-4 h-4 rounded border-stone-400 text-stone-900 cursor-pointer"
                          />
                          {PERMISSION_LABELS[permission] || permission}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-stone-600">
                სულ არჩეულია {form.permissions.length} / {PERMISSIONS.length}
              </p>
            </fieldset>
          )}
        </div>
      </Modal>

      <CredentialsModal
        credentials={credentials}
        recipient={credentialsClient?.email}
        onClose={() => setCredentials(null)}
        onSendEmail={() => {
          if (credentialsClient && credentials) {
            setEmailFor({ client: credentialsClient, credentials });
          }
          setCredentials(null);
        }}
      />

      {emailFor && (
        <QuickEmailModal
          isOpen
          onClose={() => setEmailFor(null)}
          client={emailFor.client}
          defaultTemplateKey="credentials"
          credentials={emailFor.credentials}
        />
      )}

      {/* Password reset ------------------------------------------------ */}
      <Modal
        isOpen={resetting !== null}
        title="პაროლის შეცვლა"
        onClose={() => setResetting(null)}
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setResetting(null)} disabled={busy}>
              გაუქმება
            </button>
            <button type="button" className={primaryButton} onClick={handleReset} disabled={busy}>
              {busy ? 'სრულდება...' : 'შეცვლა'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[13px] text-stone-700 leading-relaxed">
            <strong className="font-semibold">{resetting?.username}</strong> — ძველი პაროლი აღარ იმუშავებს.
            მომხმარებელს პირველ შესვლაზე ახლის დაყენება მოეთხოვება.
          </p>
          <Field id="reset-password" label="ახალი დროებითი პაროლი" required>
            {() => (
              <div className="flex gap-2">
                <input id="reset-password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className={`${inputClass} font-mono`} />
                <button type="button" onClick={() => setResetPassword(generateTemporaryPassword())} className={secondaryButton}>
                  ახალი
                </button>
              </div>
            )}
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={removing !== null}
        title="მომხმარებლის წაშლა"
        message={`„${removing?.username}“ სამუდამოდ წაიშლება და სისტემაში ვეღარ შემოვა. კლიენტის მონაცემები რჩება.`}
        confirmLabel="წაშლა"
        busy={busy}
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
};

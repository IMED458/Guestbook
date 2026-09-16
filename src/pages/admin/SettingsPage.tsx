import React, { useEffect, useState } from 'react';
import type { SystemSettings } from '../../domain/models.ts';
import { settingsService } from '../../services/systemService.ts';
import { formatBytes } from '../../services/mediaService.ts';
import { useSession } from '../../lib/session.tsx';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { primaryButton } from '../../components/ui/Modal.tsx';
import { LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

export const SettingsPage: React.FC = () => {
  const { user } = useSession();
  const toast = useToast();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService.get().then(setSettings).catch(() => setSettings(null));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await settingsService.save(settings, user?.id || '');
      toast.success('პარამეტრები შენახულია');
    } catch (err) {
      console.error('settings save failed', err);
      toast.error('შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="p-6 lg:p-8"><LoadingState /></div>;

  const set = (patch: Partial<SystemSettings>) => setSettings({ ...settings, ...patch });

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">პარამეტრები</h1>
      </header>

      <div className="space-y-5">
        <section className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-stone-900">კომპანია</h2>

          <Field id="brand" label="სახელწოდება">
            {() => <input id="brand" value={settings.brandName} onChange={(e) => set({ brandName: e.target.value })} className={inputClass} />}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="support-email" label="საკონტაქტო ელფოსტა">
              {() => <input id="support-email" type="email" value={settings.supportEmail || ''} onChange={(e) => set({ supportEmail: e.target.value })} className={inputClass} />}
            </Field>
            <Field id="support-phone" label="ტელეფონი">
              {() => <input id="support-phone" type="tel" value={settings.supportPhone || ''} onChange={(e) => set({ supportPhone: e.target.value })} className={inputClass} />}
            </Field>
          </div>

          <Field id="legal-name" label="იურიდიული სახელწოდება" hint="გამოჩნდება საჯარო სამართლებრივ გვერდებზე.">
            {(d) => <input id="legal-name" value={settings.companyLegalName || ''} onChange={(e) => set({ companyLegalName: e.target.value })} aria-describedby={d} className={inputClass} />}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="reg-number" label="საიდენტიფიკაციო ნომერი">
              {() => <input id="reg-number" value={settings.companyRegistrationNumber || ''} onChange={(e) => set({ companyRegistrationNumber: e.target.value })} className={inputClass} />}
            </Field>
            <Field id="address" label="მისამართი">
              {() => <input id="address" value={settings.companyAddress || ''} onChange={(e) => set({ companyAddress: e.target.value })} className={inputClass} />}
            </Field>
          </div>
        </section>

        <section className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-stone-900">შეკვეთები</h2>

          <Field id="order-prefix" label="შეკვეთის ნომრის პრეფიქსი" hint="მაგალითად ORD → ORD-2026-0001. ნუმერაცია ყოველ წელს თავიდან იწყება.">
            {(d) => (
              <input
                id="order-prefix"
                value={settings.orderNumberPrefix}
                onChange={(e) => set({ orderNumberPrefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) })}
                aria-describedby={d}
                className={`${inputClass} font-mono`}
              />
            )}
          </Field>
        </section>

        <section className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-stone-900">ალბომის ნაგულისხმევი პარამეტრები</h2>

          <Field id="max-file" label="ერთი ფაილის მაქსიმალური ზომა" hint={`ამჟამად ${formatBytes(settings.defaultAlbumLimits.maxFileSize)}.`}>
            {(d) => (
              <select
                id="max-file"
                value={settings.defaultAlbumLimits.maxFileSize}
                onChange={(e) => set({ defaultAlbumLimits: { ...settings.defaultAlbumLimits, maxFileSize: Number(e.target.value) } })}
                aria-describedby={d}
                className={inputClass}
              >
                {[256, 512, 1024, 2048, 5120].map((mb) => (
                  <option key={mb} value={mb * 1024 * 1024}>{formatBytes(mb * 1024 * 1024)}</option>
                ))}
              </select>
            )}
          </Field>

          <div className="space-y-2">
            {([
              ['allowImages', 'ფოტოების დაშვება'],
              ['allowVideos', 'ვიდეოების დაშვება'],
            ] as ['allowImages' | 'allowVideos', string][]).map(([key, label]) => (
              <label key={key} htmlFor={`limit-${key}`} className="flex items-center gap-2 text-[13px] text-stone-800 cursor-pointer">
                <input
                  id={`limit-${key}`}
                  type="checkbox"
                  checked={settings.defaultAlbumLimits[key]}
                  onChange={(e) => set({ defaultAlbumLimits: { ...settings.defaultAlbumLimits, [key]: e.target.checked } })}
                  className="w-4 h-4 rounded border-stone-400 text-stone-900 cursor-pointer"
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        <button type="button" onClick={save} disabled={saving} className={`${primaryButton} w-full`}>
          {saving ? 'ინახება...' : 'შენახვა'}
        </button>
      </div>
    </div>
  );
};

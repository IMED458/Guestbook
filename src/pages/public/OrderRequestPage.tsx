import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import type { CatalogItem } from '../../domain/models.ts';
import { catalogService } from '../../services/catalogService.ts';
import { requestService } from '../../services/systemService.ts';
import { useBranding } from '../../lib/branding.tsx';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { primaryButton } from '../../components/ui/Modal.tsx';

/**
 * The public enquiry form, for someone who found the site before they were
 * anybody's customer. It asks the least that still lets us call them back.
 */
export const OrderRequestPage: React.FC = () => {
  const brand = useBranding();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    catalogService
      .listItems()
      .then((list) => setItems(list.filter((i) => i.active)))
      .catch(() => setItems([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('გთხოვთ მიუთითოთ სახელი');
      return;
    }
    if (!phone.trim()) {
      setError('გთხოვთ მიუთითოთ ტელეფონი — დაგირეკავთ');
      return;
    }

    setSending(true);
    try {
      await requestService.submit({ name, phone, email, interest, comment });
      setSent(true);
    } catch (err) {
      console.error('request submit failed', err);
      setError('გაგზავნა ვერ მოხერხდა. სცადეთ ხელახლა ან დაგვირეკეთ.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50/50 via-white to-stone-50 px-4">
        <div className="max-w-sm text-center">
          <span className="w-14 h-14 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" aria-hidden="true" />
          </span>
          <h1 className="font-serif text-2xl font-bold text-stone-900">მოთხოვნა მიღებულია</h1>
          <p className="mt-3 text-[15px] text-stone-700 leading-relaxed">
            მალე დაგიკავშირდებით მითითებულ ნომერზე.
          </p>
          {brand.phone && (
            <p className="mt-5 text-[13px] text-stone-600">
              სასწრაფო კითხვისთვის: <a href={`tel:${brand.phone.replace(/\s/g, '')}`} className="font-semibold text-stone-900 underline underline-offset-4">{brand.phone}</a>
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-stone-50 px-4 py-14">
      <div className="max-w-md mx-auto">
        <header className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-stone-900">შეკვეთის მოთხოვნა</h1>
          <p className="mt-3 text-[15px] text-stone-700 leading-relaxed">
            შეავსეთ და დაგიკავშირდებით. ანგარიში არ გჭირდებათ.
          </p>
        </header>

        <form onSubmit={submit} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_4px_24px_rgba(28,25,23,0.06)] space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-[13px] font-medium text-rose-800">
              {error}
            </div>
          )}

          <Field id="req-name" label="სახელი" required>
            {() => <input id="req-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} />}
          </Field>

          <Field id="req-phone" label="ტელეფონი" required hint="ამ ნომერზე დაგიკავშირდებით.">
            {(d) => <input id="req-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" aria-describedby={d} className={inputClass} />}
          </Field>

          <Field id="req-email" label="ელფოსტა" hint="არასავალდებულო.">
            {(d) => <input id="req-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-describedby={d} className={inputClass} />}
          </Field>

          <Field id="req-interest" label="რა გაინტერესებთ">
            {() =>
              items.length > 0 ? (
                <select id="req-interest" value={interest} onChange={(e) => setInterest(e.target.value)} className={inputClass}>
                  <option value="">— აირჩიეთ —</option>
                  {items.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                  <option value="სხვა">სხვა</option>
                </select>
              ) : (
                <input id="req-interest" value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="მაგ. ონლაინ მოსაწვევი" className={inputClass} />
              )
            }
          </Field>

          <Field id="req-comment" label="კომენტარი">
            {() => <textarea id="req-comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} className={`${inputClass} resize-none`} />}
          </Field>

          <button type="submit" disabled={sending} className={`${primaryButton} w-full inline-flex items-center justify-center gap-2`}>
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                იგზავნება...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" aria-hidden="true" />
                გაგზავნა
              </>
            )}
          </button>

          <p className="text-[11px] text-stone-600 leading-relaxed text-center">
            გაგზავნით ეთანხმებით, რომ დაგიკავშირდეთ მითითებულ მონაცემებზე.
          </p>
        </form>
      </div>
    </main>
  );
};

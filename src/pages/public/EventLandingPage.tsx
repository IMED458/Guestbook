import React, { useEffect, useState } from 'react';
import { BookHeart, Images, Loader2, Sparkles } from 'lucide-react';
import type { EventRecord } from '../../domain/models.ts';
import { eventService } from '../../services/eventService.ts';
import { formatDateLong } from '../../domain/dates.ts';
import { publicAlbumUrl, publicGuestBookUrl } from '../../lib/urls.ts';

/**
 * The combined QR lands here when an event has both products. One question,
 * two answers, nothing else — a guest is standing at a party holding a phone.
 */
export const EventLandingPage: React.FC<{ slug: string }> = ({ slug }) => {
  const [event, setEvent] = useState<EventRecord | null | 'missing'>(null);

  useEffect(() => {
    eventService
      .getBySlug(slug)
      .then((found) => setEvent(found || 'missing'))
      .catch(() => setEvent('missing'));
  }, [slug]);

  if (event === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="flex items-center gap-2 text-sm text-stone-600">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          იტვირთება...
        </p>
      </main>
    );
  }

  if (event === 'missing') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-serif font-bold text-stone-900">გვერდი ვერ მოიძებნა</h1>
          <p className="mt-2 text-sm text-stone-600">შეამოწმეთ ბმული ან დაასკანერეთ QR თავიდან.</p>
        </div>
      </main>
    );
  }

  const choices = [
    event.hasGuestbook && {
      href: publicGuestBookUrl(event.slug),
      icon: <BookHeart className="w-7 h-7" aria-hidden="true" />,
      title: 'სურვილის დატოვება',
      subtitle: 'სტუმრების წიგნი',
      tone: 'border-rose-200 bg-rose-50/60 hover:border-rose-400 text-rose-900',
    },
    event.hasAlbum && {
      href: publicAlbumUrl(event.slug),
      icon: <Images className="w-7 h-7" aria-hidden="true" />,
      title: 'ფოტოების გაზიარება',
      subtitle: 'ციფრული ალბომი',
      tone: 'border-indigo-200 bg-indigo-50/60 hover:border-indigo-400 text-indigo-900',
    },
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-stone-50 px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200 text-[11px] font-semibold text-stone-700 shadow-sm">
          <Sparkles className="w-3 h-3 text-amber-600" aria-hidden="true" />
          {formatDateLong(event.eventDate)}
        </span>

        <h1 className="mt-5 font-serif text-4xl sm:text-5xl font-bold text-stone-900 leading-[1.12]">
          {event.title}
        </h1>
        {event.hosts && <p className="mt-3 text-[15px] text-stone-700">{event.hosts}</p>}

        <p className="mt-10 text-[15px] font-medium text-stone-800">რას ისურვებდით?</p>

        <div className="mt-5 space-y-3.5">
          {choices.map((choice) => (
            <a
              key={choice.href}
              href={choice.href}
              className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left shadow-[0_4px_20px_rgba(28,25,23,0.05)] hover:shadow-[0_6px_28px_rgba(28,25,23,0.09)] hover:-translate-y-0.5 ${choice.tone}`}
            >
              <span className="w-12 h-12 rounded-2xl bg-white/80 border border-white flex items-center justify-center shrink-0 shadow-sm">
                {choice.icon}
              </span>
              <span>
                <span className="block text-base font-semibold">{choice.title}</span>
                <span className="block text-[13px] opacity-75">{choice.subtitle}</span>
              </span>
            </a>
          ))}
        </div>

        <p className="mt-10 text-[12px] text-stone-500">
          ანგარიში არ გჭირდებათ — უბრალოდ აირჩიეთ და გააგრძელეთ.
        </p>
      </div>
    </main>
  );
};

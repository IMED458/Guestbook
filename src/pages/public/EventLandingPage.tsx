import React, { useEffect, useState } from 'react';
import { BookHeart, Images, Loader2 } from 'lucide-react';
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
    <main className="min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-stone-50 px-4 py-14">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900">{event.title}</h1>
        <p className="mt-2 text-sm text-stone-600">{formatDateLong(event.eventDate)}</p>

        <p className="mt-8 text-[15px] font-medium text-stone-800">რას ისურვებდით?</p>

        <div className="mt-5 space-y-3">
          {choices.map((choice) => (
            <a
              key={choice.href}
              href={choice.href}
              className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-colors text-left ${choice.tone}`}
            >
              {choice.icon}
              <span>
                <span className="block text-base font-semibold">{choice.title}</span>
                <span className="block text-[13px] opacity-80">{choice.subtitle}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
};

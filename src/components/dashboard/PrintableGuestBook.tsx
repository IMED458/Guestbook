import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, Calendar, Loader2, Images, Video } from 'lucide-react';
import { GuestBook, GuestMessage } from '../../types.ts';
import { useI18n } from '../../lib/i18n.tsx';
import { api } from '../../lib/api.ts';
import { buildThumbnail } from '../../lib/cloudinary.ts';

interface PrintableGuestBookProps {
  guestBook: GuestBook;
  onBack: () => void;
}

export const PrintableGuestBook: React.FC<PrintableGuestBookProps> = ({ guestBook, onBack }) => {
  const { lang, translateRelationship } = useI18n();
  const ka = lang === 'ka';
  const locale = ka ? 'ka-GE' : 'en-US';

  // The dashboard list is filtered and searched. An album must contain the
  // whole book, so it loads its own complete set.
  const [messages, setMessages] = useState<GuestMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api.messages
      .listAdmin(guestBook.id, { status: 'APPROVED', sort: 'oldest' })
      .then((all) => {
        if (!cancelled) setMessages(all);
      })
      .catch((err) => {
        console.error('Could not load the album contents:', err);
        if (!cancelled) {
          setError(ka ? 'ალბომის ჩატვირთვა ვერ მოხერხდა.' : 'Could not load the album.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [guestBook.id, ka]);

  const photos = (messages || []).flatMap((m) =>
    (m.media || [])
      .filter((med) => med.type === 'IMAGE')
      .map((med) => ({ ...med, guestName: m.name }))
  );
  const videoCount = (messages || []).reduce(
    (n, m) => n + (m.media || []).filter((med) => med.type === 'VIDEO').length,
    0
  );

  const eventDate = new Date(guestBook.eventDate).toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  if (!messages && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-stone-100 text-stone-700">
        <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
        <p className="text-sm font-medium">{ka ? 'ალბომი მზადდება...' : 'Preparing your album…'}</p>
      </div>
    );
  }

  // Rendered straight into <body> so that the print stylesheet can hide every
  // other top-level element — navbar, footer, cookie banner — with one rule,
  // no matter how the app shell is nested.
  return createPortal(
    <div className="album-root fixed inset-0 z-[60] overflow-y-auto bg-stone-200 py-8 px-4 print:static print:bg-white print:p-0 print:m-0 print:overflow-visible">
      {/* Toolbar — never printed */}
      <div className="max-w-[210mm] mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 bg-white border border-stone-300 px-4 py-2 rounded-xl hover:bg-stone-50 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{ka ? 'პანელზე დაბრუნება' : 'Back to Dashboard'}</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-700">
            {ka
              ? `${messages?.length || 0} ჩანაწერი · ${photos.length} ფოტო`
              : `${messages?.length || 0} entries · ${photos.length} photos`}
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs font-bold text-white bg-stone-900 px-5 py-2.5 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>{ka ? 'დაბეჭდვა ან PDF-ში შენახვა' : 'Print or Save as PDF'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="max-w-[210mm] mx-auto mb-6 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-sm print:hidden"
        >
          {error}
        </div>
      )}

      {/* The album itself. `print-album` is what the print stylesheet keeps. */}
      <article className="print-album max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none">
        {/* ---------- Cover page ---------- */}
        <section className="album-page relative flex flex-col items-center justify-center text-center px-12 py-20 min-h-[297mm]">
          {guestBook.coverImage && (
            <img
              src={buildThumbnail(guestBook.coverImage, 1400)}
              alt={ka ? `${guestBook.title} — ყდის ფოტო` : `${guestBook.title} — cover photo`}
              className="w-full max-h-[110mm] object-cover rounded-sm mb-10"
            />
          )}

          <span className="text-[11px] uppercase tracking-[0.35em] text-stone-500 font-semibold">
            {ka ? 'სამახსოვრო ალბომი' : 'Commemorative Album'}
          </span>

          <h1 className="mt-4 text-5xl font-serif font-bold text-stone-900 leading-tight">
            {guestBook.title}
          </h1>

          <div className="mt-5 flex items-center justify-center gap-2.5 text-sm text-stone-700 font-serif">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <span>{eventDate}</span>
            <span aria-hidden="true">•</span>
            <span>{guestBook.hostNames}</span>
          </div>

          {guestBook.welcomeMessage && (
            <p className="mt-10 max-w-md text-base text-stone-700 italic font-serif leading-relaxed">
              &ldquo;{guestBook.welcomeMessage}&rdquo;
            </p>
          )}

          <div className="mt-auto pt-16 text-xs text-stone-500 font-serif">
            {ka
              ? `${messages?.length || 0} მოგონება · ${photos.length} ფოტო`
              : `${messages?.length || 0} memories · ${photos.length} photographs`}
          </div>
        </section>

        {/* ---------- Entries ---------- */}
        <section className="album-page px-12 py-14">
          <h2 className="text-center text-[11px] uppercase tracking-[0.3em] text-stone-500 font-semibold mb-10">
            {ka ? 'სტუმრების ჩანაწერები' : 'Guest Entries'}
          </h2>

          <div className="space-y-8">
            {(messages || []).map((msg) => {
              const entryPhotos = (msg.media || []).filter((m) => m.type === 'IMAGE');
              const entryVideos = (msg.media || []).filter((m) => m.type === 'VIDEO');

              return (
                <div key={msg.id} className="album-entry pb-8 border-b border-stone-200 last:border-0">
                  <div className="flex items-baseline justify-between gap-4 mb-2">
                    <h3 className="font-serif font-bold text-stone-900 text-lg">{msg.name}</h3>
                    <span className="text-[11px] text-stone-600 whitespace-nowrap">
                      {new Date(msg.createdAt).toLocaleDateString(locale, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      {msg.relationship && ` · ${translateRelationship(msg.relationship)}`}
                    </span>
                  </div>

                  <p className="text-[15px] text-stone-800 leading-[1.8] font-serif whitespace-pre-line">
                    {msg.message}
                  </p>

                  {entryPhotos.length > 0 && (
                    <div
                      className={`mt-4 grid gap-3 ${
                        entryPhotos.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-2'
                      }`}
                    >
                      {entryPhotos.map((photo) => (
                        <figure key={photo.id} className="m-0">
                          <img
                            src={buildThumbnail(photo.url, 900)}
                            alt={
                              ka
                                ? `${msg.name}-ის მიერ ატვირთული ფოტო`
                                : `Photo uploaded by ${msg.name}`
                            }
                            className="w-full rounded-sm border border-stone-200 object-cover max-h-[85mm]"
                          />
                        </figure>
                      ))}
                    </div>
                  )}

                  {entryVideos.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {entryVideos.map((video) => (
                        <div key={video.id} className="flex items-start gap-3">
                          {video.thumbnailUrl && (
                            <img
                              src={video.thumbnailUrl}
                              alt={
                                ka
                                  ? `${msg.name}-ის ვიდეოს კადრი`
                                  : `Still frame from a video by ${msg.name}`
                              }
                              className="w-28 rounded-sm border border-stone-200 object-cover"
                            />
                          )}
                          <p className="text-[11px] text-stone-600 leading-relaxed">
                            <Video className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" aria-hidden="true" />
                            {ka
                              ? 'ვიდეო მოგონება — ხელმისაწვდომია ციფრულ წიგნში:'
                              : 'Video memory — watch it in the digital book:'}
                            <br />
                            <span className="font-mono break-all text-[10px] text-stone-700">
                              {video.url}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {(messages || []).length === 0 && (
              <p className="text-center text-sm text-stone-600 py-20 font-serif">
                {ka
                  ? 'ჯერ არცერთი დამტკიცებული ჩანაწერი არ არის.'
                  : 'There are no approved entries yet.'}
              </p>
            )}
          </div>
        </section>

        {/* ---------- Photo plates ---------- */}
        {photos.length > 0 && (
          <section className="album-page album-page-break px-12 py-14">
            <h2 className="text-center text-[11px] uppercase tracking-[0.3em] text-stone-500 font-semibold mb-2">
              {ka ? 'ფოტო ალბომი' : 'Photo Plates'}
            </h2>
            <p className="text-center text-xs text-stone-600 font-serif mb-10">
              {ka
                ? `${photos.length} ფოტო, ატვირთული სტუმრების მიერ`
                : `${photos.length} photographs contributed by your guests`}
            </p>

            <div className="grid grid-cols-2 gap-5">
              {photos.map((photo) => (
                <figure key={photo.id} className="album-entry m-0">
                  <img
                    src={buildThumbnail(photo.url, 900)}
                    alt={
                      ka
                        ? `${photo.guestName}-ის მიერ ატვირთული ფოტო`
                        : `Photo uploaded by ${photo.guestName}`
                    }
                    className="w-full rounded-sm border border-stone-200 object-cover aspect-[4/3]"
                  />
                  <figcaption className="mt-1.5 text-[11px] text-stone-600 font-serif italic">
                    {photo.guestName}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Colophon ---------- */}
        <section className="album-page px-12 py-12 text-center border-t border-stone-200">
          <Images className="w-5 h-5 mx-auto text-stone-500 mb-3" aria-hidden="true" />
          <p className="text-xs text-stone-700 font-serif">
            {ka
              ? `„${guestBook.title}" · ${eventDate}`
              : `“${guestBook.title}” · ${eventDate}`}
          </p>
          <p className="mt-1 text-[11px] text-stone-600 font-serif">
            {ka
              ? `${messages?.length || 0} ჩანაწერი · ${photos.length} ფოტო${videoCount ? ` · ${videoCount} ვიდეო` : ''}`
              : `${messages?.length || 0} entries · ${photos.length} photos${videoCount ? ` · ${videoCount} videos` : ''}`}
          </p>
        </section>
      </article>
    </div>,
    document.body
  );
};

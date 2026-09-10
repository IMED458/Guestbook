import React from 'react';
import { Printer, ArrowLeft, Heart, Calendar } from 'lucide-react';
import { GuestBook, GuestMessage } from '../../types.ts';
import { useI18n } from '../../lib/i18n.tsx';

interface PrintableGuestBookProps {
  guestBook: GuestBook;
  messages: GuestMessage[];
  onBack: () => void;
}

export const PrintableGuestBook: React.FC<PrintableGuestBookProps> = ({
  guestBook,
  messages,
  onBack
}) => {
  const { lang, translateRelationship } = useI18n();
  const approvedMessages = messages.filter((m) => m.status === 'APPROVED');

  const handlePrint = () => {
    window.print();
  };

  const locale = lang === 'ka' ? 'ka-GE' : 'en-US';

  return (
    <div className="min-h-screen bg-stone-100 py-8 px-4 print:bg-white print:p-0">
      {/* Top action bar (hidden during print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 px-4 py-2 rounded-xl hover:bg-stone-50 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'ka' ? 'პანელზე დაბრუნება' : 'Back to Dashboard'}</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500">
            {lang === 'ka' ? `${approvedMessages.length} მოგონება მომზადებულია დასაბეჭდად` : `${approvedMessages.length} memories formatted for print`}
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-xs font-bold text-white bg-stone-900 px-5 py-2.5 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'ka' ? 'დაბეჭდვა ან PDF-ში შენახვა' : 'Print or Save to PDF'}</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-stone-200 p-8 sm:p-12 print:shadow-none print:border-none print:p-6 print:rounded-none">
        {/* Cover Header */}
        <div className="text-center pb-8 border-b-2 border-stone-900/10 mb-8">
          <span className="text-xs uppercase tracking-widest text-stone-500 font-bold">
            {lang === 'ka' ? 'სამახსოვრო სტუმრების წიგნი' : 'COMMEMORATIVE GUEST BOOK'}
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 mt-2">
            {guestBook.title}
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm text-stone-600 mt-3 font-serif">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span>
              {new Date(guestBook.eventDate).toLocaleDateString(locale, {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
            <span>•</span>
            <span>{lang === 'ka' ? `მასპინძელი: ${guestBook.hostNames}` : `Hosted by ${guestBook.hostNames}`}</span>
          </div>

          <p className="mt-4 text-sm text-stone-700 italic max-w-xl mx-auto font-serif">
            &ldquo;{guestBook.welcomeMessage}&rdquo;
          </p>
        </div>

        {/* Message Entries */}
        <div className="space-y-6">
          {approvedMessages.map((msg) => {
            const photo = msg.media?.find((m) => m.type === 'IMAGE');

            return (
              <div
                key={msg.id}
                className="p-6 rounded-xl border border-stone-200 bg-stone-50/50 print:bg-white print:border-stone-300 print:break-inside-avoid"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-bold text-stone-900 text-base font-serif">
                      {msg.name}
                    </h3>
                    <span className="text-[11px] text-stone-500">
                      {new Date(msg.createdAt).toLocaleDateString(locale, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  {msg.relationship && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-stone-200 text-stone-700">
                      {translateRelationship(msg.relationship)}
                    </span>
                  )}
                </div>

                <p className="text-sm text-stone-800 leading-relaxed font-serif whitespace-pre-line mb-3">
                  {msg.message}
                </p>

                {photo && (
                  <div className="mt-3 max-w-sm rounded-lg overflow-hidden border border-stone-200">
                    <img
                      src={photo.url}
                      alt="Guest photo"
                      className="w-full h-auto max-h-60 object-cover"
                    />
                  </div>
                )}

                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="mt-3 pt-2 border-t border-stone-200/60 flex items-center gap-2 text-xs text-stone-500">
                    {Object.entries(msg.reactions).map(([emoji, count]) => (
                      <span key={emoji} className="inline-flex items-center gap-1">
                        <span>{emoji}</span>
                        <span>{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Booklet Footer */}
        <div className="mt-12 pt-6 border-t border-stone-200 text-center text-xs text-stone-400 font-serif">
          {lang === 'ka' ? 'დაბეჭდილია Memoria ციფრული სტუმრების წიგნიდან' : 'Printed from Memoria Digital Guest Book • Created with love'}
        </div>
      </div>
    </div>
  );
};

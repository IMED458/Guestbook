import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer } from 'lucide-react';
import type { EventRecord } from '../../domain/models.ts';
import { eventService } from '../../services/eventService.ts';
import { formatDateLong } from '../../domain/dates.ts';
import { publicAlbumUrl, publicEventUrl, publicGuestBookUrl } from '../../lib/urls.ts';
import { downloadBlob } from '../../lib/download.ts';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { EmptyState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

type Target = 'guestbook' | 'album' | 'combined';
type Template = 'classic' | 'minimal' | 'elegant' | 'romantic' | 'mono';

const TEMPLATES: { id: Template; label: string; card: string; title: string; accent: string }[] = [
  { id: 'classic', label: 'კლასიკური', card: 'bg-white border-stone-300', title: 'font-serif text-stone-900', accent: 'text-stone-600' },
  { id: 'minimal', label: 'მინიმალისტური', card: 'bg-white border-stone-200', title: 'font-sans text-stone-900 tracking-tight', accent: 'text-stone-500' },
  { id: 'elegant', label: 'ელეგანტური', card: 'bg-amber-50/60 border-amber-200', title: 'font-serif text-amber-950', accent: 'text-amber-800' },
  { id: 'romantic', label: 'რომანტიკული', card: 'bg-rose-50/70 border-rose-200', title: 'font-serif text-rose-950', accent: 'text-rose-800' },
  { id: 'mono', label: 'შავ-თეთრი', card: 'bg-white border-stone-900 border-2', title: 'font-sans text-stone-950', accent: 'text-stone-700' },
];

const TARGET_DEFAULTS: Record<Target, { subtitle: string; instruction: string }> = {
  guestbook: { subtitle: 'დაგვიტოვეთ თბილი სიტყვები', instruction: 'დაასკანერეთ ტელეფონის კამერით' },
  album: { subtitle: 'გაგვიზიარეთ თქვენი ფოტოები და ვიდეოები', instruction: 'დაასკანერეთ ტელეფონის კამერით' },
  combined: { subtitle: 'დაგვიტოვეთ სურვილი ან გაგვიზიარეთ ფოტოები', instruction: 'დაასკანერეთ ტელეფონის კამერით' },
};

/**
 * A printable card, not a bare PNG. The QR is rendered as SVG so it stays
 * sharp at any print size — a raster code enlarged to A4 is exactly what
 * makes a scanner hesitate.
 */
export const QrStudioPage: React.FC = () => {
  const toast = useToast();

  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [eventId, setEventId] = useState('');
  const [target, setTarget] = useState<Target>('album');
  const [template, setTemplate] = useState<Template>('classic');
  const [subtitle, setSubtitle] = useState(TARGET_DEFAULTS.album.subtitle);
  const [instruction, setInstruction] = useState(TARGET_DEFAULTS.album.instruction);
  const [svg, setSvg] = useState('');

  useEffect(() => {
    eventService
      .list()
      .then((list) => {
        setEvents(list);
        if (list[0]) setEventId(list[0].id);
      })
      .catch(() => setEvents([]));
  }, []);

  const event = useMemo(() => (events || []).find((e) => e.id === eventId), [events, eventId]);

  const url = useMemo(() => {
    if (!event) return '';
    if (target === 'guestbook') return publicGuestBookUrl(event.slug);
    if (target === 'album') return publicAlbumUrl(event.slug);
    return publicEventUrl(event.slug);
  }, [event, target]);

  useEffect(() => {
    if (!url) {
      setSvg('');
      return;
    }
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1c1917', light: '#ffffff' } })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [url]);

  const changeTarget = (next: Target) => {
    setTarget(next);
    setSubtitle(TARGET_DEFAULTS[next].subtitle);
    setInstruction(TARGET_DEFAULTS[next].instruction);
  };

  const downloadSvg = useCallback(() => {
    if (!svg || !event) return;
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${event.slug}-${target}-qr.svg`);
  }, [svg, event, target]);

  /** Rasterise from the vector at a size that survives print. */
  const downloadPng = useCallback(async () => {
    if (!url || !event) return;
    try {
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 2048, color: { dark: '#1c1917', light: '#ffffff' } });
      const res = await fetch(dataUrl);
      downloadBlob(await res.blob(), `${event.slug}-${target}-qr.png`);
    } catch {
      toast.error('PNG-ის შექმნა ვერ მოხერხდა');
    }
  }, [url, event, target, toast]);

  if (events === null) return <div className="p-6 lg:p-8"><LoadingState /></div>;

  if (events.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-semibold text-stone-900">QR დიზაინი</h1>
        <div className="mt-5 bg-white border border-stone-200 rounded-xl">
          <EmptyState title="ღონისძიება ჯერ არ არის" hint="QR კოდი ღონისძიებას სჭირდება — ჯერ ის შექმენით." />
        </div>
      </div>
    );
  }

  const style = TEMPLATES.find((t) => t.id === template) || TEMPLATES[0];

  return (
    <div className="p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">QR დიზაინი</h1>
          <p className="mt-1 text-sm text-stone-600">დასაბეჭდი ბარათი სტუმრების მაგიდისთვის</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadSvg} disabled={!svg} className={`${secondaryButton} inline-flex items-center gap-1.5`}>
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            SVG
          </button>
          <button type="button" onClick={downloadPng} disabled={!url} className={`${secondaryButton} inline-flex items-center gap-1.5`}>
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            PNG
          </button>
          <button type="button" onClick={() => window.print()} disabled={!svg} className={`${primaryButton} inline-flex items-center gap-1.5`}>
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            ბეჭდვა
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 print:hidden">
          <Field id="qr-event" label="ღონისძიება" required>
            {() => (
              <select id="qr-event" value={eventId} onChange={(e) => setEventId(e.target.value)} className={inputClass}>
                {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            )}
          </Field>

          <fieldset>
            <legend className="text-[13px] font-semibold text-stone-800 mb-2">რისთვის</legend>
            <div className="space-y-1.5">
              {([
                ['guestbook', 'სტუმრების წიგნი', event?.hasGuestbook],
                ['album', 'ციფრული ალბომი', event?.hasAlbum],
                ['combined', 'საერთო გვერდი', event?.hasGuestbook && event?.hasAlbum],
              ] as [Target, string, boolean | undefined][]).map(([id, label, available]) => (
                <label
                  key={id}
                  htmlFor={`target-${id}`}
                  className={`flex items-center gap-2 text-[13px] ${available ? 'text-stone-800 cursor-pointer' : 'text-stone-400 cursor-not-allowed'}`}
                >
                  <input
                    id={`target-${id}`}
                    type="radio"
                    name="qr-target"
                    checked={target === id}
                    disabled={!available}
                    onChange={() => changeTarget(id)}
                    className="w-4 h-4 border-stone-400 text-stone-900"
                  />
                  {label}
                  {!available && <span className="text-[11px]">(არ აქვს)</span>}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[13px] font-semibold text-stone-800 mb-2">შაბლონი</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  aria-pressed={template === t.id}
                  className={`px-2.5 py-2 rounded-lg text-[12px] font-semibold cursor-pointer transition-colors ${
                    template === t.id ? 'bg-stone-900 text-white' : 'bg-white border border-stone-300 text-stone-800 hover:bg-stone-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          <Field id="qr-subtitle" label="წარწერა">
            {() => <input id="qr-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputClass} />}
          </Field>

          <Field id="qr-instruction" label="მითითება">
            {() => <input id="qr-instruction" value={instruction} onChange={(e) => setInstruction(e.target.value)} className={inputClass} />}
          </Field>

          {url && (
            <p className="text-[11px] text-stone-600 font-mono break-all">{url}</p>
          )}
        </div>

        {/* The card itself — this is what the print stylesheet keeps. */}
        <div className="flex justify-center">
          <div className={`qr-card w-full max-w-sm aspect-[3/4] rounded-2xl border p-8 flex flex-col items-center justify-center text-center ${style.card}`}>
            <h2 className={`text-3xl leading-tight font-bold ${style.title}`}>{event?.title}</h2>

            {subtitle && <p className={`mt-3 text-sm leading-relaxed ${style.accent}`}>{subtitle}</p>}

            {svg ? (
              <div
                className="mt-7 w-44 h-44 [&>svg]:w-full [&>svg]:h-full"
                role="img"
                aria-label={`QR კოდი — ${event?.title}`}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="mt-7 w-44 h-44 bg-stone-100 rounded-lg" />
            )}

            {instruction && <p className={`mt-5 text-[13px] font-medium ${style.accent}`}>{instruction}</p>}

            {event && <p className={`mt-auto pt-6 text-xs ${style.accent}`}>{formatDateLong(event.eventDate)}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

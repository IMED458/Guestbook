import React, { useEffect, useRef, useState } from 'react';
import { Check, ImageOff, Link2, Loader2, Upload } from 'lucide-react';
import { useI18n } from '../../lib/i18n.tsx';
import { api } from '../../lib/api.ts';
import { buildThumbnail } from '../../lib/cloudinary.ts';

interface CoverImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  presets: string[];
}

type PreviewState = 'idle' | 'loading' | 'ok' | 'error';

/**
 * Three ways to set a cover: pick a preset, paste any image address (the
 * "Copy image address" URL from any site), or upload a file to Cloudinary.
 * A pasted URL is verified by actually loading it, so a broken or non-image
 * link says so instead of silently producing an empty banner.
 */
export const CoverImagePicker: React.FC<CoverImagePickerProps> = ({
  value,
  onChange,
  presets
}) => {
  const { lang } = useI18n();
  const ka = lang === 'ka';

  const [draft, setDraft] = useState(value);
  const [preview, setPreview] = useState<PreviewState>(value ? 'loading' : 'idle');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);

  // Debounce, so the preview does not thrash while a URL is being typed.
  useEffect(() => {
    const url = draft.trim();
    if (!url) {
      setPreview('idle');
      return;
    }

    setPreview('loading');
    const timer = window.setTimeout(() => {
      const probe = new Image();
      // Some hosts refuse cross-origin reads; we only need it to render.
      probe.referrerPolicy = 'no-referrer';
      probe.onload = () => {
        setPreview('ok');
        onChange(url);
      };
      probe.onerror = () => setPreview('error');
      probe.src = url;
    }, 450);

    return () => window.clearTimeout(timer);
  }, [draft]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const uploaded = await api.upload.uploadFile(file, setUploadProgress);
      setDraft(uploaded.url);
      onChange(uploaded.url);
      setPreview('ok');
    } catch (err: any) {
      setUploadError(
        err?.message || (ka ? 'ატვირთვა ვერ მოხერხდა.' : 'Upload failed.')
      );
      e.target.value = '';
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Curated presets */}
      <div className="grid grid-cols-3 gap-2.5">
        {presets.map((img) => {
          const isSelected = value === img;
          return (
            <button
              key={img}
              type="button"
              onClick={() => {
                setDraft(img);
                onChange(img);
              }}
              aria-pressed={isSelected}
              aria-label={ka ? 'მზა ყდის ფოტოს არჩევა' : 'Select this preset cover'}
              className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${
                isSelected
                  ? 'border-stone-900 shadow-md'
                  : 'border-transparent opacity-80 hover:opacity-100'
              }`}
            >
              <img src={buildThumbnail(img, 320)} alt="" className="w-full h-full object-cover" />
              {isSelected && (
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center">
                  <Check className="w-3 h-3" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Paste any image address */}
      <div>
        <label
          htmlFor="cover-url-input"
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 mb-1.5"
        >
          <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
          {ka ? 'ან ჩასვით ფოტოს ბმული' : 'Or paste an image address'}
        </label>

        <input
          id="cover-url-input"
          type="text"
          inputMode="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-describedby="cover-url-hint"
          placeholder="https://example.com/photo.jpg"
          className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
        />

        <p id="cover-url-hint" className="mt-1.5 text-[11px] text-stone-600 leading-relaxed">
          {ka
            ? 'ნებისმიერ საიტზე ფოტოზე მარჯვენა ღილაკი → „Copy image address" და ჩასვით აქ.'
            : 'Right-click any photo on the web → “Copy image address”, then paste it here.'}
        </p>
      </div>

      {/* Upload instead */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
          id="cover-file-input"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="w-full py-2.5 px-4 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 hover:bg-stone-50 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>{ka ? `იტვირთება ${uploadProgress}%` : `Uploading ${uploadProgress}%`}</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>{ka ? 'ან ატვირთეთ საკუთარი ფოტო' : 'Or upload your own photo'}</span>
            </>
          )}
        </button>

        {uploadError && (
          <p role="alert" className="mt-2 text-[11px] text-rose-700 font-medium">
            {uploadError}
          </p>
        )}
      </div>

      {/* Live preview of whatever is currently set */}
      <div
        className="rounded-xl border border-stone-200 bg-stone-50 overflow-hidden"
        role="status"
        aria-live="polite"
      >
        {preview === 'ok' && (
          <img
            src={draft.trim()}
            referrerPolicy="no-referrer"
            alt={ka ? 'არჩეული ყდის ფოტოს გადახედვა' : 'Preview of the selected cover photo'}
            className="w-full h-36 object-cover"
          />
        )}

        {preview === 'loading' && (
          <div className="h-36 flex items-center justify-center gap-2 text-xs text-stone-600">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {ka ? 'ფოტო მოწმდება...' : 'Checking the image…'}
          </div>
        )}

        {preview === 'error' && (
          <div className="h-36 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
            <ImageOff className="w-5 h-5 text-rose-600" aria-hidden="true" />
            <p className="text-xs font-semibold text-rose-800">
              {ka ? 'ამ ბმულიდან ფოტო ვერ ჩაიტვირთა' : 'That link did not load as an image'}
            </p>
            <p className="text-[11px] text-stone-600">
              {ka
                ? 'ზოგი საიტი კრძალავს სურათის გარე გამოყენებას — სცადეთ ატვირთვა.'
                : 'Some sites block hotlinking — try uploading the file instead.'}
            </p>
          </div>
        )}

        {preview === 'idle' && (
          <div className="h-36 flex items-center justify-center text-xs text-stone-600">
            {ka ? 'ყდის ფოტო ჯერ არჩეული არ არის' : 'No cover photo chosen yet'}
          </div>
        )}
      </div>
    </div>
  );
};

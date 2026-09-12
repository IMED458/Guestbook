import React from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../lib/i18n.tsx';
import { useModalA11y } from '../../lib/useModalA11y.ts';

interface ImageLightboxProps {
  url: string | null;
  guestName?: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ url, guestName, onClose }) => {
  const { lang } = useI18n();
  const { ref: dialogRef } = useModalA11y(Boolean(url), onClose);

  if (!url) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ka' ? 'ფოტოს გადიდებული ხედი' : 'Enlarged photo view'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
        aria-label={lang === 'ka' ? 'ფოტოს დახურვა' : 'Close image preview'}
      >
        <X className="w-6 h-6" aria-hidden="true" />
      </button>

      <div
        className="max-w-4xl max-h-[85dvh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={
            guestName
              ? (lang === 'ka'
                  ? `${guestName}-ის მიერ ატვირთული ფოტო`
                  : `Photo uploaded by ${guestName}`)
              : (lang === 'ka' ? 'სტუმრების წიგნში ატვირთული ფოტო' : 'Photo uploaded to the guest book')
          }
          className="max-w-full max-h-[75dvh] object-contain rounded-lg shadow-2xl"
        />
        {guestName && (
          <p className="mt-3 text-sm text-stone-300 font-medium tracking-wide">
            {lang === 'ka' ? `გაზიარებულია: ${guestName}` : `Shared by ${guestName}`}
          </p>
        )}
      </div>
    </div>
  );
};

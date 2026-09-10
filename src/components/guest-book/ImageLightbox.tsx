import React from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../lib/i18n.tsx';

interface ImageLightboxProps {
  url: string | null;
  guestName?: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ url, guestName, onClose }) => {
  const { lang } = useI18n();
  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
        aria-label="Close image preview"
      >
        <X className="w-6 h-6" />
      </button>

      <div
        className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={guestName ? `Photo by ${guestName}` : 'Guest book photo'}
          className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
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

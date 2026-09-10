import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, Share2, MessageCircle, ExternalLink, QrCode } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { useI18n } from '../../lib/i18n.tsx';
import { useModalA11y } from '../../lib/useModalA11y.ts';

interface ShareModalProps {
  isOpen: boolean;
  title: string;
  url: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  title,
  url,
  onClose
}) => {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const { ref: dialogRef } = useModalA11y(isOpen, onClose);

  useEffect(() => {
    if (isOpen && url) {
      setLoadingQr(true);
      api.qrcode.getPng(url)
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error('QR code fetch error:', err))
        .finally(() => setLoadingQr(false));
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: lang === 'ka' ? `დატოვეთ სურვილი ან მოგონება: ${title}!` : `Leave a message in the guest book for ${title}!`,
          url
        });
      } catch {
        // Ignored if user dismissed
      }
    } else {
      handleCopy();
    }
  };

  const shareText = encodeURIComponent(lang === 'ka' ? `დატოვეთ შეტყობინება სტუმრების წიგნში: ${title}` : `Leave a message in our digital guest book: ${title}`);
  const encodedUrl = encodeURIComponent(url);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}%20${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `guestbook-qr-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        id="share-modal-card"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden relative"
      >
        <button
          onClick={onClose}
          aria-label={lang === 'ka' ? 'ფანჯრის დახურვა' : 'Close this dialog'}
          className="absolute top-4 right-4 p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center mx-auto mb-3">
            <Share2 className="w-6 h-6" aria-hidden="true" />
          </div>

          <h3 id="share-modal-title" className="text-xl font-serif font-bold text-stone-900">
            {t('guestbook', 'shareGuestbook')}
          </h3>
          <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto">
            {t('guestbook', 'scanQrHint')}
          </p>

          {/* QR Code Container */}
          <div className="mt-5 p-4 bg-stone-50 rounded-2xl border border-stone-200 inline-block">
            {loadingQr ? (
              <div role="status" className="w-48 h-48 flex items-center justify-center text-xs text-stone-600">
                {lang === 'ka' ? 'QR კოდი გენერირდება...' : 'Generating QR code...'}
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={
                  lang === 'ka'
                    ? 'QR კოდი, რომლის დასკანერებითაც სტუმრების წიგნი იხსნება'
                    : 'QR code that opens this guest book when scanned'
                }
                className="w-48 h-48 mx-auto rounded-lg shadow-xs"
              />
            ) : (
              <div role="alert" className="w-48 h-48 flex items-center justify-center text-xs text-rose-700">
                {lang === 'ka' ? 'QR კოდის ჩატვირთვა ვერ მოხერხდა' : 'Failed to load QR code'}
              </div>
            )}
            <div className="mt-2 text-[11px] text-stone-500 font-mono">
              {t('guestbook', 'scanWithPhone')}
            </div>
          </div>

          {/* Link Box */}
          <div className="mt-5 flex items-center gap-2 p-1.5 bg-stone-100 rounded-xl border border-stone-200 text-left">
            <input
              type="text"
              readOnly
              value={url}
              className="w-full bg-transparent px-2.5 py-1 text-xs text-stone-700 font-mono truncate focus:outline-none"
            />
            <button
              id="copy-link-btn"
              onClick={handleCopy}
              className="flex-shrink-0 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('guestbook', 'copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t('guestbook', 'copy')}</span>
                </>
              )}
            </button>
          </div>

          {/* Social Share Buttons */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Facebook</span>
            </a>

            <button
              onClick={handleNativeShare}
              className="py-2 px-3 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{lang === 'ka' ? 'მეტი' : 'More'}</span>
            </button>
          </div>

          {/* Download QR Button */}
          <div className="mt-4 pt-4 border-t border-stone-100">
            <button
              onClick={handleDownloadPng}
              disabled={!qrDataUrl}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('guestbook', 'downloadQr')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

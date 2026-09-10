import React, { useEffect, useRef, useState } from 'react';
import { Cookie } from 'lucide-react';
import { useI18n } from '../../lib/i18n.tsx';
import { getConsent, hasDecided, onConsentChange, setConsent } from '../../lib/consent.ts';
import type { LegalSlug } from '../../content/legal.ts';

interface CookieBannerProps {
  /** Set by the footer's "Cookie settings" link to re-open a settled choice. */
  forceOpen: boolean;
  onDismissForced: () => void;
  onNavigateLegal: (slug: LegalSlug) => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({
  forceOpen,
  onDismissForced,
  onNavigateLegal
}) => {
  const { lang } = useI18n();
  const ka = lang === 'ka';

  const [visible, setVisible] = useState(!hasDecided());
  const [analytics, setAnalytics] = useState(getConsent()?.analytics ?? false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => onConsentChange(() => setVisible(!hasDecided())), []);

  useEffect(() => {
    if (forceOpen) {
      setAnalytics(getConsent()?.analytics ?? false);
      setVisible(true);
    }
  }, [forceOpen]);

  // Move focus into the banner so keyboard and screen-reader users meet it
  // immediately, and let Escape dismiss a re-opened one.
  useEffect(() => {
    if (!visible) return;
    firstButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && forceOpen) {
        close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, forceOpen]);

  const close = () => {
    setVisible(false);
    onDismissForced();
  };

  const decide = (allowAnalytics: boolean) => {
    setConsent(allowAnalytics);
    close();
  };

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="mx-auto max-w-3xl rounded-2xl bg-white border border-stone-300 shadow-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center">
            <Cookie className="w-4.5 h-4.5 text-stone-700" aria-hidden="true" />
          </span>

          <div className="min-w-0">
            <h2 id="cookie-banner-title" className="text-base font-semibold text-stone-900">
              {ka ? 'ქუქიები და ლოკალური მეხსიერება' : 'Cookies and local storage'}
            </h2>

            <p id="cookie-banner-desc" className="mt-1.5 text-sm text-stone-700 leading-relaxed">
              {ka
                ? 'აუცილებელი მონაცემები საიტის მუშაობისთვის ყოველთვის ინახება. დამატებით გვსურს დავითვალოთ ვიზიტები, რომ მასპინძელს სტატისტიკა ვაჩვენოთ — ეს მხოლოდ თქვენი თანხმობით ხდება. სარეკლამო თვალთვალს არ ვიყენებთ.'
                : 'Strictly necessary storage always runs so the site works. We would also like to count visits so hosts can see statistics — that happens only if you agree. We use no advertising trackers.'}
            </p>

            <label className="mt-4 flex items-start gap-2.5 text-sm text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-stone-400 text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 cursor-pointer"
              />
              <span>
                {ka
                  ? 'ვეთანხმები ვიზიტების დათვლას (ანალიტიკა)'
                  : 'Allow visit counting (analytics)'}
              </span>
            </label>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              {/* Reject is given the same visual weight as accept. */}
              <button
                ref={firstButtonRef}
                type="button"
                onClick={() => decide(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-400 bg-white text-stone-900 text-sm font-semibold hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 cursor-pointer"
              >
                {ka ? 'მხოლოდ აუცილებელი' : 'Necessary only'}
              </button>
              <button
                type="button"
                onClick={() => decide(true)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 cursor-pointer"
              >
                {ka ? 'ყველაფრის დაშვება' : 'Allow all'}
              </button>
              <button
                type="button"
                onClick={() => decide(analytics)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-800 text-sm font-semibold hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 cursor-pointer"
              >
                {ka ? 'არჩევანის შენახვა' : 'Save choice'}
              </button>
            </div>

            <p className="mt-3 text-xs text-stone-600">
              <a
                href="#/legal/cookies"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateLegal('cookies');
                }}
                className="underline underline-offset-4 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 rounded"
              >
                {ka ? 'ქუქიების პოლიტიკა' : 'Cookie policy'}
              </a>
              {' · '}
              <a
                href="#/legal/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateLegal('privacy');
                }}
                className="underline underline-offset-4 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 rounded"
              >
                {ka ? 'კონფიდენციალურობა' : 'Privacy policy'}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

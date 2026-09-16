import React, { useEffect, useMemo } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../lib/i18n.tsx';
import { LEGAL_SLUGS, buildLegalDocs, legalNavLabels, type LegalSlug } from '../../content/legal.ts';
import { SITE } from '../../lib/site-config.ts';
import { useBranding } from '../../lib/branding.tsx';

interface LegalPageProps {
  slug: LegalSlug;
  onBackToHome: () => void;
  onNavigateLegal: (slug: LegalSlug) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ slug, onBackToHome, onNavigateLegal }) => {
  const { lang } = useI18n();
  const brand = useBranding();
  // Built at render time so the operator's details come from Settings.
  const docs = useMemo(
    () =>
      buildLegalDocs({
        productName: brand.productName,
        legalName: brand.legalName,
        registrationNumber: brand.registrationNumber,
        address: brand.address,
        email: brand.email,
        privacyEmail: brand.email || SITE.privacyEmail,
        lastUpdated: brand.settings?.updatedAt?.slice(0, 10) || SITE.lastUpdated,
      }),
    [brand]
  );

  const doc = docs[slug][lang === 'ka' ? 'ka' : 'en'];

  useEffect(() => {
    document.title = `${doc.title} — ${brand.productName}`;
    window.scrollTo({ top: 0 });
  }, [doc.title, brand.productName]);

  return (
    <div className="flex-1 bg-stone-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 rounded-lg px-1 py-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{lang === 'ka' ? 'დაბრუნება მთავარზე' : 'Back to home'}</span>
        </button>

        <h1 className="mt-6 text-3xl sm:text-4xl font-serif font-bold text-stone-900">
          {doc.title}
        </h1>
        <p className="mt-3 text-stone-700 leading-relaxed">{doc.summary}</p>
        <p className="mt-2 text-xs text-stone-600">
          {lang === 'ka' ? 'ბოლო განახლება: ' : 'Last updated: '}
          <time dateTime={SITE.lastUpdated}>{SITE.lastUpdated}</time>
        </p>

        {!brand.complete && (
          <div
            role="note"
            className="mt-6 flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              {lang === 'ka'
                ? 'ეს დოკუმენტი შაბლონია: ოპერატორის იურიდიული რეკვიზიტები ჯერ არ არის შევსებული. შეავსეთ სამართავ პანელში — პარამეტრები → კომპანია.'
                : 'This document is a template: the operator’s legal details have not been filled in yet. Complete them in Settings → Company.'}
            </p>
          </div>
        )}

        <div className="mt-10 space-y-9">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg sm:text-xl font-semibold text-stone-900">
                {section.heading}
              </h2>

              {section.paragraphs?.map((p, i) => (
                <p key={i} className="mt-3 text-sm sm:text-base text-stone-700 leading-relaxed">
                  {p}
                </p>
              ))}

              {section.bullets && (
                <ul className="mt-3 space-y-2 list-disc pl-5 text-sm sm:text-base text-stone-700 leading-relaxed marker:text-stone-500">
                  {section.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <nav
          aria-label={lang === 'ka' ? 'სხვა სამართლებრივი გვერდები' : 'Other legal pages'}
          className="mt-14 pt-8 border-t border-stone-300"
        >
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-600">
            {lang === 'ka' ? 'სხვა დოკუმენტები' : 'Other documents'}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_SLUGS
              .filter((s) => s !== slug)
              .map((s) => (
                <li key={s}>
                  <a
                    href={`#/legal/${s}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigateLegal(s);
                    }}
                    className="text-sm font-medium text-stone-800 underline underline-offset-4 hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 rounded"
                  >
                    {legalNavLabels[s][lang === 'ka' ? 'ka' : 'en']}
                  </a>
                </li>
              ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

import React from 'react';
import { Cookie } from 'lucide-react';
import { useI18n } from '../../lib/i18n.tsx';
import { legalNavLabels, type LegalSlug } from '../../content/legal.ts';
import { useBranding } from '../../lib/branding.tsx';

interface SiteFooterProps {
  onNavigateLegal: (slug: LegalSlug) => void;
  onOpenCookieSettings: () => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  onNavigateLegal,
  onOpenCookieSettings
}) => {
  const { lang } = useI18n();
  const brand = useBranding();
  const ka = lang === 'ka';

  return (
    <footer className="bg-stone-950 text-stone-300 text-sm border-t border-stone-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-3">
        {/* Identity */}
        <div>
          <span className="font-serif font-bold text-white text-base tracking-tight">
            {brand.productName}
          </span>
          <p className="mt-2 text-stone-400 leading-relaxed">
            {ka
              ? 'ციფრული სტუმრების წიგნი ქორწილებისთვის, დაბადების დღეებისა და ღონისძიებებისთვის.'
              : 'A digital guest book for weddings, birthdays, and events.'}
          </p>
        </div>

        {/* Legal navigation */}
        <nav aria-label={ka ? 'სამართლებრივი ინფორმაცია' : 'Legal information'}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
            {ka ? 'სამართლებრივი' : 'Legal'}
          </h2>
          <ul className="mt-3 space-y-2">
            {(Object.keys(legalNavLabels) as LegalSlug[]).map((slug) => (
              <li key={slug}>
                <a
                  href={`#/legal/${slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateLegal(slug);
                  }}
                  className="text-stone-300 hover:text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 rounded"
                >
                  {legalNavLabels[slug][ka ? 'ka' : 'en']}
                </a>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={onOpenCookieSettings}
                className="inline-flex items-center gap-1.5 text-stone-300 hover:text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 rounded cursor-pointer"
              >
                <Cookie className="w-3.5 h-3.5" aria-hidden="true" />
                {ka ? 'ქუქიების პარამეტრები' : 'Cookie settings'}
              </button>
            </li>
          </ul>
        </nav>

        {/* Operator details — required by consumer law */}
        <address className="not-italic">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
            {ka ? 'ოპერატორი' : 'Operator'}
          </h2>
          <ul className="mt-3 space-y-1.5 text-stone-300">
            <li>{brand.legalName}</li>
            <li className="text-stone-400">{brand.address}</li>
            <li className="text-stone-400">
              {ka ? 'ს/ნ: ' : 'Reg. no: '}
              {brand.registrationNumber}
            </li>
            <li>
              <a
                href={`mailto:${brand.email}`}
                className="text-stone-300 hover:text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 rounded"
              >
                {brand.email}
              </a>
            </li>
            {brand.phone && (
              <li>
                <a
                  href={`tel:${brand.phone.replace(/\s/g, '')}`}
                  className="text-stone-300 hover:text-white underline underline-offset-4 rounded"
                >
                  {brand.phone}
                </a>
              </li>
            )}
          </ul>

          {!brand.complete && (
            <p className="mt-3 text-xs text-amber-300">
              {ka
                ? '⚠️ რეკვიზიტები შესავსებია — პარამეტრები → კომპანია.'
                : '⚠️ Business details still to be filled in — Settings → Company.'}
            </p>
          )}
        </address>
      </div>

      <div className="border-t border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-stone-400">
          © {new Date().getFullYear()} {brand.legalName}.{' '}
          {ka ? 'ყველა უფლება დაცულია.' : 'All rights reserved.'}
        </div>
      </div>
    </footer>
  );
};

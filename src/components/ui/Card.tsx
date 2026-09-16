import React from 'react';

/**
 * The shared surface of the admin.
 *
 * The public site is warm and editorial — serif headings, soft rounded cards,
 * amber and rose accents on stone. The back office borrows that vocabulary so
 * the two read as one product, while staying denser and quieter: this is
 * software people sit in front of all day.
 */
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}> = ({ children, className = '', padded = true }) => (
  <section
    className={`rounded-2xl border border-stone-200/90 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)] ${
      padded ? 'p-5' : ''
    } ${className}`}
  >
    {children}
  </section>
);

export const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
    <div>
      <h2 className="font-serif text-lg font-bold text-stone-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[13px] text-stone-600">{subtitle}</p>}
    </div>
    {action}
  </div>
);

/** The page title block, shared so every screen starts the same way. */
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  back?: { label: string; onClick: () => void };
}> = ({ title, subtitle, action, back }) => (
  <header className="mb-6">
    {back && (
      <button
        type="button"
        onClick={back.onClick}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-600 hover:text-stone-900 cursor-pointer mb-3"
      >
        ← {back.label}
      </button>
    )}
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-serif text-[26px] font-bold text-stone-900 tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  </header>
);

/** A single figure, for the dashboard and detail sidebars. */
export const StatTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'warning' | 'danger';
}> = ({ label, value, hint, tone = 'default' }) => {
  const valueTone = {
    default: 'text-stone-900',
    positive: 'text-emerald-800',
    warning: 'text-amber-800',
    danger: 'text-rose-800',
  }[tone];

  return (
    <div className="rounded-xl border border-stone-200/90 bg-white px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 font-serif text-2xl font-bold ${valueTone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-stone-600">{hint}</p>}
    </div>
  );
};

/** A quiet status pill. Colour reinforces the word; it never replaces it. */
export const Pill: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${className}`}
  >
    {children}
  </span>
);

import React from 'react';

/**
 * A labelled form control. Every input in the back office goes through this so
 * the label, the hint and the error are bound to the field by id rather than
 * merely sitting near it.
 */
interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: (describedBy: string | undefined) => React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ id, label, hint, error, required, children }) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-semibold text-stone-800">
        {label}
        {required && (
          <span className="text-rose-600" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>

      {children(describedBy)}

      {hint && !error && (
        <p id={hintId} className="text-[11px] text-stone-600 leading-relaxed">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-[11px] font-medium text-rose-700 leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
};

/** The shared input styling, so every form in the admin looks like one system. */
export const inputClass =
  'w-full px-3 py-2.5 text-base sm:text-sm bg-white border border-stone-300 rounded-lg ' +
  'placeholder:text-stone-400 transition-colors ' +
  'focus:outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 ' +
  'disabled:bg-stone-100 disabled:text-stone-500';

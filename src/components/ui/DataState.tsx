import React from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { secondaryButton } from './Modal.tsx';

/**
 * Loading, empty and error are all real states a view can be in. Rendering a
 * blank screen for any of them leaves the person guessing whether the system
 * is working.
 */

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'იტვირთება...' }) => (
  <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-stone-600">
    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export const EmptyState: React.FC<{ title: string; hint?: string; action?: React.ReactNode }> = ({
  title,
  hint,
  action,
}) => (
  <div className="py-16 text-center">
    <p className="text-sm font-medium text-stone-800">{title}</p>
    {hint && <p className="mt-1.5 text-[13px] text-stone-600">{hint}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div role="alert" className="py-14 text-center">
    <p className="text-sm font-medium text-rose-800">{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className={`${secondaryButton} mt-4 inline-flex items-center gap-2`}>
        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        ხელახლა ცდა
      </button>
    )}
  </div>
);

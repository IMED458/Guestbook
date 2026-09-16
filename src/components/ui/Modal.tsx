import React from 'react';
import { X } from 'lucide-react';
import { useModalA11y } from '../../lib/useModalA11y.ts';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Wider form layouts, e.g. an order with its line items. */
  size?: 'md' | 'lg';
}

/**
 * A bounded dialog: the header and footer stay put and only the body scrolls,
 * so a long form never pushes its own heading or its save button off screen.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  onClose,
  children,
  footer,
  size = 'md',
}) => {
  const { ref } = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-stone-950/50">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`w-full ${size === 'lg' ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] bg-white rounded-xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden`}
      >
        <div className="shrink-0 flex items-center justify-between gap-4 px-5 py-4 border-b border-stone-200">
          <h2 id="modal-title" className="text-base font-semibold text-stone-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ფანჯრის დახურვა"
            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
          >
            <X className="w-4.5 h-4.5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="shrink-0 px-5 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const primaryButton =
  'px-4 py-2 rounded-lg bg-stone-900 text-white text-[13px] font-semibold hover:bg-stone-800 ' +
  'transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

export const secondaryButton =
  'px-4 py-2 rounded-lg border border-stone-300 bg-white text-stone-800 text-[13px] font-semibold ' +
  'hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

export const dangerButton =
  'px-4 py-2 rounded-lg bg-rose-700 text-white text-[13px] font-semibold hover:bg-rose-800 ' +
  'transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700';

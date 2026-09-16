import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

/** Every mutation says what happened, in Georgian, and gets out of the way. */
type ToastKind = 'success' | 'error';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

let nextId = 1;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, kind, message }]);
    // Errors linger, because they usually need reading twice.
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, kind === 'error' ? 7000 : 3500);
  }, []);

  const value = useMemo<ToastValue>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 max-w-sm"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-lg shadow-lg border text-[13px] font-medium ${
              toast.kind === 'success'
                ? 'bg-white border-emerald-300 text-stone-900'
                : 'bg-white border-rose-300 text-stone-900'
            }`}
          >
            {toast.kind === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              aria-label="დახურვა"
              className="text-stone-500 hover:text-stone-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
}

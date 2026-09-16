import React from 'react';
import { Copy } from 'lucide-react';
import { Modal, primaryButton } from '../ui/Modal.tsx';
import { useToast } from '../ui/Toast.tsx';

/**
 * The single moment a temporary password is visible. Nothing stores it, and
 * there is no way to show it again — so the copy is deliberate and the
 * warning is plain.
 */
export const CredentialsModal: React.FC<{
  credentials: { username: string; password: string } | null;
  onClose: () => void;
}> = ({ credentials, onClose }) => {
  const toast = useToast();

  const copy = (label: string, value: string) => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} დაკოპირდა`);
  };

  return (
    <Modal
      isOpen={credentials !== null}
      title="ანგარიშის მონაცემები"
      onClose={onClose}
      footer={
        <button type="button" className={primaryButton} onClick={onClose}>
          დავიმახსოვრე
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-[13px] text-stone-700 leading-relaxed">
          ეს პაროლი მხოლოდ ახლა ჩანს — სისტემა მას არ ინახავს და ხელახლა ვერ გაჩვენებთ.
          გადაეცით კლიენტს და შეინახეთ უსაფრთხოდ.
        </p>

        <dl className="rounded-xl border border-stone-200 bg-stone-50 divide-y divide-stone-200">
          {[
            ['მომხმარებელი', credentials?.username || ''],
            ['პაროლი', credentials?.password || ''],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">{label}</dt>
                <dd className="mt-0.5 font-mono text-sm text-stone-900 break-all">{value}</dd>
              </div>
              <button
                type="button"
                onClick={() => copy(label, value)}
                aria-label={`${label} — კოპირება`}
                className="shrink-0 p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </dl>

        <p className="text-[11px] text-stone-600 leading-relaxed">
          წერილით გასაგზავნად გამოიყენეთ „ანგარიშის მონაცემები“ თარგი — პაროლი
          იქ ხელით ჩაისმება, სისტემა მას არსად არ ინახავს.
        </p>
      </div>
    </Modal>
  );
};

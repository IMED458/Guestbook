import React from 'react';
import { Copy, Mail } from 'lucide-react';
import { Modal, primaryButton, secondaryButton } from '../ui/Modal.tsx';
import { useToast } from '../ui/Toast.tsx';

/**
 * The single moment a temporary password is visible. Nothing stores it, and
 * there is no way to show it again — so the copy is deliberate and the
 * warning is plain.
 */
export const CredentialsModal: React.FC<{
  credentials: { username: string; password: string } | null;
  onClose: () => void;
  /**
   * Offered when we know where to write. Sending has to happen from here,
   * while the password is still in memory — a minute later there is nowhere
   * left to read it from.
   */
  onSendEmail?: () => void;
  recipient?: string;
}> = ({ credentials, onClose, onSendEmail, recipient }) => {
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
        <>
          {onSendEmail && recipient && (
            <button
              type="button"
              className={`${secondaryButton} inline-flex items-center gap-1.5`}
              onClick={onSendEmail}
            >
              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
              ელფოსტით გაგზავნა
            </button>
          )}
          <button type="button" className={primaryButton} onClick={onClose}>
            დავიმახსოვრე
          </button>
        </>
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

        {onSendEmail && recipient ? (
          <p className="text-[11px] text-stone-600 leading-relaxed">
            „ელფოსტით გაგზავნა“ თარგში პაროლს ავტომატურად ჩასვამს და
            <strong className="font-semibold"> {recipient}</strong>-ს გაუგზავნის.
            შეგიძლიათ ბმულებიც იმავე წერილში დაურთოთ.
          </p>
        ) : (
          <p className="text-[11px] text-stone-600 leading-relaxed">
            ამ კლიენტს ელფოსტა მითითებული არ აქვს — პაროლი ხელით გადაეცით.
          </p>
        )}
      </div>
    </Modal>
  );
};

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, dangerButton, secondaryButton } from './Modal.tsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Destructive actions are never one click away from the list they sit in. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'დადასტურება',
  busy,
  onConfirm,
  onCancel,
}) => (
  <Modal
    isOpen={isOpen}
    title={title}
    onClose={onCancel}
    footer={
      <>
        <button type="button" className={secondaryButton} onClick={onCancel} disabled={busy}>
          გაუქმება
        </button>
        <button type="button" className={dangerButton} onClick={onConfirm} disabled={busy}>
          {busy ? 'სრულდება...' : confirmLabel}
        </button>
      </>
    }
  >
    <div className="flex gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm text-stone-700 leading-relaxed">{message}</p>
    </div>
  </Modal>
);

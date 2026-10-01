'use client';

import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import './ConfirmModal.css';

export type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  targetName?: string;
  targetDetails?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  icon?: ReactNode;
};

export function ConfirmModal({
  isOpen,
  title,
  message,
  targetName,
  targetDetails,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = true,
  onConfirm,
  onCancel,
  icon,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-modal-icon ${isDanger ? 'warning' : ''}`}>
          {icon ?? <ShieldAlert size={28} />}
        </div>

        <div className="confirm-modal-body">
          <h3>{title}</h3>
          <p>{message}</p>
          {(targetName || targetDetails) && (
            <div className="confirm-modal-target">
              {targetName && <strong>{targetName}</strong>}
              {targetDetails && <span>{targetDetails}</span>}
            </div>
          )}
        </div>

        <div className="confirm-modal-actions">
          <button type="button" className="confirm-modal-btn cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-modal-btn ${isDanger ? 'danger' : 'primary'}`}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type MouseEvent,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { RiShieldFlashLine as ShieldAlert } from '@remixicon/react';
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
    const titleId = useId();
    const messageId = useId();
    const targetId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const requestGenerationRef = useRef(0);
    const pendingRef = useRef(false);
    const dismissalRequestedRef = useRef(false);
    const restoreCancelAfterPendingRef = useRef(false);
    const mountedRef = useRef(false);
    const onConfirmRef = useRef(onConfirm);
    const onCancelRef = useRef(onCancel);
    const [isPending, setIsPending] = useState(false);

    const cancelSafely = useCallback(() => {
        if (pendingRef.current || dismissalRequestedRef.current) return;
        dismissalRequestedRef.current = true;
        onCancelRef.current();
    }, []);

    useEffect(() => {
        onConfirmRef.current = onConfirm;
    }, [onConfirm]);

    useEffect(() => {
        onCancelRef.current = onCancel;
    }, [onCancel]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useLayoutEffect(() => {
        if (!isOpen) {
            pendingRef.current = false;
            dismissalRequestedRef.current = false;
            setIsPending(false);
            return;
        }

        const generation = ++requestGenerationRef.current;
        pendingRef.current = false;
        dismissalRequestedRef.current = false;
        restoreCancelAfterPendingRef.current = false;
        setIsPending(false);
        previousFocusRef.current =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        cancelButtonRef.current?.focus();

        const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                cancelSafely();
                return;
            }
            if (event.key !== 'Tab') return;

            const dialog = dialogRef.current;
            if (!dialog) return;
            const focusable = Array.from(
                dialog.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            ).filter(
                (element) =>
                    !element.hasAttribute('hidden') &&
                    element.getAttribute('aria-hidden') !== 'true',
            );

            if (!focusable.length) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (
                event.shiftKey &&
                (active === first || !dialog.contains(active))
            ) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                (active === last || !dialog.contains(active))
            ) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleDocumentKeyDown, true);

        return () => {
            document.removeEventListener(
                'keydown',
                handleDocumentKeyDown,
                true,
            );
            requestGenerationRef.current = generation + 1;
            pendingRef.current = false;
            dismissalRequestedRef.current = false;
            restoreCancelAfterPendingRef.current = false;
            const previousFocus = previousFocusRef.current;
            previousFocusRef.current = null;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [cancelSafely, isOpen]);

    useEffect(() => {
        if (isOpen && !isPending && restoreCancelAfterPendingRef.current) {
            restoreCancelAfterPendingRef.current = false;
            cancelButtonRef.current?.focus();
        }
    }, [isOpen, isPending]);

    if (!isOpen) return null;

    const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        event.stopPropagation();
        cancelSafely();
    };

    const handleConfirm = async () => {
        if (pendingRef.current) return;
        pendingRef.current = true;
        restoreCancelAfterPendingRef.current = true;
        setIsPending(true);
        dialogRef.current?.focus();
        const generation = requestGenerationRef.current;

        try {
            await onConfirmRef.current();
        } catch {
            // Callers own user-facing errors. Keep the dialog usable and avoid
            // an unhandled rejection from an asynchronous confirmation.
        } finally {
            if (
                mountedRef.current &&
                requestGenerationRef.current === generation
            ) {
                pendingRef.current = false;
                setIsPending(false);
            }
        }
    };

    const describedBy =
        targetName || targetDetails ? `${messageId} ${targetId}` : messageId;

    const modal = (
        <div className="admin-modal-overlay" onClick={handleBackdropClick}>
            <div
                ref={dialogRef}
                className="confirm-modal-box"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={describedBy}
                aria-busy={isPending}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={`confirm-modal-icon ${isDanger ? 'warning' : ''}`}
                    aria-hidden="true"
                >
                    {icon ?? <ShieldAlert size={28} />}
                </div>

                <div className="confirm-modal-body">
                    <h3 id={titleId}>{title}</h3>
                    <p id={messageId}>{message}</p>
                    {(targetName || targetDetails) && (
                        <div className="confirm-modal-target" id={targetId}>
                            {targetName && <strong>{targetName}</strong>}
                            {targetDetails && <span>{targetDetails}</span>}
                        </div>
                    )}
                </div>

                <div className="confirm-modal-actions">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        className="confirm-modal-btn cancel"
                        disabled={isPending}
                        onClick={cancelSafely}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`confirm-modal-btn ${isDanger ? 'danger' : 'primary'}`}
                        disabled={isPending}
                        onClick={() => void handleConfirm()}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document === 'undefined'
        ? modal
        : createPortal(modal, document.body);
}

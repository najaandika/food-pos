import type { Ref } from 'react';

export type TableManualCopyDialogProps = {
    url: string;
    onClose: () => void;
    onRetryCopy: () => void;
    dialogRef?: Ref<HTMLDivElement>;
};

export function TableManualCopyDialog({
    url,
    onClose,
    onRetryCopy,
    dialogRef,
}: TableManualCopyDialogProps) {
    return (
        <div
            className="admin-modal-overlay"
            onClick={(event) => {
                if (!event || event.target === event.currentTarget) onClose();
            }}
        >
            <div
                className="standee-modal-content tables-copy-dialog"
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Salin tautan pemesanan customer"
                aria-labelledby="tables-manual-copy-title"
                aria-describedby="tables-manual-copy-description"
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
            >
                <h3 id="tables-manual-copy-title">Salin tautan QR meja</h3>
                <p id="tables-manual-copy-description">
                    Browser tidak mengizinkan penyalinan otomatis. Klik tautan
                    di bawah, lalu tekan Ctrl+C.
                </p>
                <label htmlFor="customer-qr-url">Tautan pemesanan</label>
                <input
                    id="customer-qr-url"
                    value={url}
                    readOnly
                    autoFocus
                    onFocus={(event) => event.currentTarget.select()}
                    onClick={(event) => event.currentTarget.select()}
                    onMouseUp={(event) => {
                        event.preventDefault();
                        event.currentTarget.select();
                    }}
                />
                <div className="standee-modal-actions">
                    <button
                        type="button"
                        className="standee-btn-secondary"
                        onClick={() => onClose()}
                    >
                        Tutup
                    </button>
                    <a
                        className="standee-btn-secondary"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Buka customer
                    </a>
                    <button
                        type="button"
                        className="standee-btn-primary"
                        onClick={onRetryCopy}
                    >
                        Coba salin lagi
                    </button>
                </div>
            </div>
        </div>
    );
}

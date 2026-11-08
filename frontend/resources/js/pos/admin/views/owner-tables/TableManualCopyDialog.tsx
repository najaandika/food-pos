export type TableManualCopyDialogProps = {
    url: string;
    onClose: () => void;
    onRetryCopy: () => void;
};

export function TableManualCopyDialog({
    url,
    onClose,
    onRetryCopy,
}: TableManualCopyDialogProps) {
    return (
        <div className="admin-modal-overlay" onClick={() => onClose()}>
            <div
                className="standee-modal-content tables-copy-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Salin tautan pemesanan customer"
                onClick={(event) => event.stopPropagation()}
            >
                <h3>Salin tautan QR meja</h3>
                <p>
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

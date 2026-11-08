import { RiPrinterLine as Printer, RiCloseLine as X } from '@remixicon/react';
import type { AdminTable } from '../../runtime-data';

export type TablePrintStandeeProps = {
    table: AdminTable;
    url: string;
    qrImage: string;
    t: (key: string) => string;
    onClose: () => void;
    onPrint: () => void;
};

export function TablePrintStandee({
    table,
    url,
    qrImage,
    t,
    onClose,
    onPrint,
}: TablePrintStandeeProps) {
    return (
        <div className="admin-modal-overlay" onClick={() => onClose()}>
            <div
                className="standee-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="standee-modal-header">
                    <div>
                        <h3>{t('ownerTables.standeeTitle')}</h3>
                        <p>{t('ownerTables.standeeDesc')}</p>
                    </div>
                    <button
                        type="button"
                        className="standee-modal-close"
                        onClick={() => onClose()}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Standee Printable Card */}
                <div className="standee-card-wrap" id="printable-table-standee">
                    <div className="standee-card">
                        <div className="standee-header">
                            <span className="standee-badge">
                                {t('ownerTables.selfServiceOrder')}
                            </span>
                            <h2>{t('ownerTables.standeeCafeName')}</h2>
                            <p>{t('ownerTables.standeeTagline')}</p>
                        </div>

                        <div className="standee-table-box">
                            <span className="standee-table-label">
                                {t('ownerTables.tableNumber')}
                            </span>
                            <strong className="standee-table-number">
                                {table.code}
                            </strong>
                            <span className="standee-table-area">
                                {table.area} • {table.seats}{' '}
                                {t('ownerTables.seats')}
                            </span>
                        </div>

                        <div className="standee-qr-frame">
                            {qrImage && (
                                <img
                                    src={qrImage}
                                    alt={'QR pemesanan meja ' + table.code}
                                    width={170}
                                    height={170}
                                    className="standee-qr-svg"
                                />
                            )}
                        </div>
                        <div className="standee-instructions">
                            <p>
                                <strong>{t('ownerTables.step1')}</strong>
                            </p>
                            <p>
                                <strong>{t('ownerTables.step2')}</strong>
                            </p>
                            <p>
                                <strong>{t('ownerTables.step3')}</strong>
                            </p>
                        </div>

                        <div className="standee-footer">
                            <small style={{ overflowWrap: 'anywhere' }}>
                                {url}
                            </small>
                        </div>
                    </div>
                </div>

                <div className="standee-modal-actions">
                    <button
                        type="button"
                        className="standee-btn-secondary"
                        onClick={() => onClose()}
                    >
                        {t('common.close')}
                    </button>
                    <button
                        type="button"
                        className="standee-btn-primary"
                        onClick={onPrint}
                    >
                        <Printer size={18} />
                        <span>{t('ownerTables.printStandee')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

import { RiFileList3Line, RiPrinterLine } from '@remixicon/react';
import { Button } from '../../../../../../../components/base/buttons/button';
import {
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
} from '../../../../../../../components/base/modal/modal';
import type { AdminOrder } from '../../../runtime-data';
import type { AuthUser } from '../../../auth';
import type { PosSettings } from '../../../../../lib/pos-types';
import type { useLocale } from '../../../i18n-context';

type PaymentMethod = 'cash' | 'qris' | 'transfer';
type Props = {
    selectedOrder?: AdminOrder;
    showReceiptModal: boolean;
    setShowReceiptModal: (open: boolean) => void;
    receiptOpenedAt: Date | null;
    user?: AuthUser;
    settings?: PosSettings;
    locale: ReturnType<typeof useLocale>['locale'];
    t: ReturnType<typeof useLocale>['t'];
    formatRupiah: (value: number) => string;
    totals: {
        rawSubtotal: number;
        discount: string;
        discountAmount: number;
        taxRate: number;
        tax: number;
        serviceRate: number;
        serviceCharge: number;
        total: number;
        method: PaymentMethod;
        cashReceived: number;
        change: number;
    };
};

export function CashierBillPreviewModal({
    selectedOrder,
    showReceiptModal,
    setShowReceiptModal,
    receiptOpenedAt,
    user,
    settings,
    locale,
    t,
    formatRupiah,
    totals: {
        rawSubtotal,
        discount,
        discountAmount,
        taxRate,
        tax,
        serviceRate,
        serviceCharge,
        total,
        method,
        cashReceived,
        change,
    },
}: Props) {
    return (
        <Modal
            isOpen={showReceiptModal && Boolean(selectedOrder)}
            onOpenChange={setShowReceiptModal}
            size="lg"
            overlayClassName="cashier-receipt-overlay"
            className="cashier-receipt-dialog"
        >
            {({ close }) =>
                selectedOrder ? (
                    <>
                        <ModalHeader
                            icon={RiFileList3Line}
                            title={
                                locale === 'id'
                                    ? 'Rincian tagihan'
                                    : 'Bill details'
                            }
                            description={
                                locale === 'id'
                                    ? 'Pratinjau tagihan · belum terverifikasi server'
                                    : 'Bill preview · not verified by server'
                            }
                            closeLabel={t('common.close')}
                        />
                        <ModalBody className="cashier-receipt-body">
                            {/* Thermal 80mm preview. */}
                            <div
                                className="receipt-paper"
                                id="printable-pos-receipt"
                            >
                                <div className="receipt-center-head">
                                    <h2>
                                        {settings?.profile.cafeName ||
                                            'FOOD POS'}
                                    </h2>
                                    {settings?.profile.address && (
                                        <p>{settings.profile.address}</p>
                                    )}
                                    {settings?.profile.phone && (
                                        <p>{settings.profile.phone}</p>
                                    )}
                                    <p className="cashier-receipt-demo-stamp">
                                        {locale === 'id'
                                            ? 'BELUM TERVERIFIKASI · BUKAN BUKTI BAYAR'
                                            : 'UNVERIFIED · NOT PROOF OF PAYMENT'}
                                    </p>
                                    <div className="receipt-divider-dash"></div>
                                </div>

                                <div className="receipt-meta-grid">
                                    <div>
                                        <span>
                                            {locale === 'id'
                                                ? 'No Struk'
                                                : 'Receipt No'}
                                            :
                                        </span>
                                        <strong>
                                            {selectedOrder.orderNumber ??
                                                `#POS-${selectedOrder.id}`}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>
                                            {locale === 'id'
                                                ? 'Tanggal'
                                                : 'Date'}
                                            :
                                        </span>
                                        <strong>
                                            {receiptOpenedAt?.toLocaleString(
                                                locale === 'id'
                                                    ? 'id-ID'
                                                    : 'en-US',
                                                {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                },
                                            ) ?? '—'}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>{t('nav.cashier')}:</span>
                                        <strong>
                                            {user?.name ?? t('nav.cashier')}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>
                                            {locale === 'id'
                                                ? 'Meja / Tipe'
                                                : 'Table / Type'}
                                            :
                                        </span>
                                        <strong>
                                            {selectedOrder.table} (
                                            {selectedOrder.type === 'takeaway'
                                                ? t('menu.takeaway')
                                                : t('menu.dineIn')}
                                            )
                                        </strong>
                                    </div>
                                    <div>
                                        <span>
                                            {locale === 'id'
                                                ? 'Pelanggan'
                                                : 'Customer'}
                                            :
                                        </span>
                                        <strong>{selectedOrder.name}</strong>
                                    </div>
                                </div>

                                <div className="receipt-divider-dash"></div>

                                <table className="receipt-table">
                                    <thead>
                                        <tr>
                                            <th className="th-left">Item</th>
                                            <th className="th-center">Qty</th>
                                            <th className="th-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedOrder.items ?? []).map(
                                            ([name, qty, price], idx) => (
                                                <tr key={idx}>
                                                    <td className="td-left">
                                                        {name}
                                                    </td>
                                                    <td className="td-center">
                                                        x{qty}
                                                    </td>
                                                    <td className="td-right">
                                                        {price}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>

                                <div className="receipt-divider-dash"></div>

                                <div className="receipt-totals">
                                    <div>
                                        <span>{t('cashier.subtotal')}</span>
                                        <strong>
                                            {formatRupiah(rawSubtotal)}
                                        </strong>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div>
                                            <span>
                                                {t('cashier.discount')} (
                                                {discount})
                                            </span>
                                            <strong>
                                                -{formatRupiah(discountAmount)}
                                            </strong>
                                        </div>
                                    )}
                                    <div>
                                        <span>
                                            {t('cashier.tax')} ({taxRate}%)
                                        </span>
                                        <strong>{formatRupiah(tax)}</strong>
                                    </div>
                                    {serviceCharge > 0 && (
                                        <div>
                                            <span>
                                                {t('cashier.serviceCharge')} (
                                                {serviceRate}%)
                                            </span>
                                            <strong>
                                                {formatRupiah(serviceCharge)}
                                            </strong>
                                        </div>
                                    )}
                                    <div className="receipt-grand-total">
                                        <span>
                                            {t(
                                                'cashier.grandTotal',
                                            ).toUpperCase()}
                                        </span>
                                        <strong>{formatRupiah(total)}</strong>
                                    </div>
                                    <div className="receipt-payment-info">
                                        <div>
                                            <span>
                                                {locale === 'id'
                                                    ? 'Metode dipilih'
                                                    : 'Selected method'}
                                                :
                                            </span>
                                            <strong className="text-uppercase">
                                                {method}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>
                                                {locale === 'id'
                                                    ? 'Uang diterima'
                                                    : 'Cash received'}
                                                :
                                            </span>
                                            <strong>
                                                {method === 'cash'
                                                    ? formatRupiah(cashReceived)
                                                    : '—'}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>{t('cashier.change')}:</span>
                                            <strong>
                                                {method === 'cash'
                                                    ? formatRupiah(change)
                                                    : '—'}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="receipt-divider-dash"></div>

                                <div className="receipt-footer">
                                    <p>{t('cashier.thankYou')}</p>
                                    <p>
                                        {locale === 'id'
                                            ? 'Silakan Datang Kembali'
                                            : 'Please Come Again'}
                                    </p>
                                    <small>
                                        {locale === 'id'
                                            ? 'Belum diverifikasi server'
                                            : 'Not verified by server'}
                                    </small>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="secondary"
                                size="medium"
                                className="receipt-btn-secondary"
                                onClick={close}
                            >
                                {t('common.close')}
                            </Button>
                            <Button
                                variant="primary"
                                size="medium"
                                leadingIcon={RiPrinterLine}
                                className="receipt-btn-primary"
                                onClick={() => window.print()}
                            >
                                {t('cashier.printReceipt')}
                            </Button>
                        </ModalFooter>
                    </>
                ) : null
            }
        </Modal>
    );
}

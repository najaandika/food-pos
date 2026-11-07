import { RiCheckboxCircleLine, RiPrinterLine } from '@remixicon/react';
import { Button } from '../../../../../../components/base/buttons/button';
import {
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
} from '../../../../../../components/base/modal/modal';
import type { PosSettings } from '@/lib/pos-types';
import { formatRupiah } from '../../../lib/format';
import type { ConfirmedCashierReceipt } from './cashier-api';

type Props = {
    receipt: ConfirmedCashierReceipt | null;
    settings?: PosSettings;
    onClose: () => void;
};

const rupiah = (value: string | number) => formatRupiah(Number(value));

export function ConfirmedReceiptModal({ receipt, settings, onClose }: Props) {
    return (
        <Modal
            isOpen={Boolean(receipt)}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            size="lg"
            overlayClassName="cashier-receipt-overlay"
            className="cashier-receipt-dialog"
        >
            {({ close }) =>
                receipt ? (
                    <>
                        <ModalHeader
                            icon={RiCheckboxCircleLine}
                            title="Struk pembayaran lunas"
                            description="Transaksi tersimpan dan terverifikasi oleh Laravel"
                            closeLabel="Tutup"
                        />
                        <ModalBody className="cashier-receipt-body">
                            <div
                                id="printable-pos-receipt"
                                className="receipt-paper"
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
                                    <p className="cashier-receipt-paid-stamp">
                                        LUNAS · PEMBAYARAN TERVERIFIKASI
                                    </p>
                                </div>
                                <div className="receipt-divider-dash" />
                                <div className="receipt-meta-grid">
                                    <div>
                                        <span>Nomor pesanan</span>
                                        <strong>{receipt.orderNumber}</strong>
                                    </div>
                                    <div>
                                        <span>ID pembayaran</span>
                                        <strong>#{receipt.payment.id}</strong>
                                    </div>
                                    <div>
                                        <span>Waktu lunas (WIB)</span>
                                        <strong>
                                            {new Intl.DateTimeFormat('id-ID', {
                                                timeZone: 'Asia/Jakarta',
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            }).format(
                                                new Date(
                                                    receipt.payment.paidAt,
                                                ),
                                            )}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>Pelanggan</span>
                                        <strong>{receipt.customerName}</strong>
                                    </div>
                                    <div>
                                        <span>Meja / tipe</span>
                                        <strong>
                                            {receipt.tableCode ?? '—'} /{' '}
                                            {receipt.type === 'takeaway'
                                                ? 'Takeaway'
                                                : 'Dine-in'}
                                        </strong>
                                    </div>
                                </div>
                                <div className="receipt-divider-dash" />
                                <table className="receipt-table">
                                    <thead>
                                        <tr>
                                            <th className="th-left">Item</th>
                                            <th className="th-center">Qty</th>
                                            <th className="th-right">Jumlah</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {receipt.items.map((item) => (
                                            <tr key={item.id}>
                                                <td className="td-left">
                                                    {item.name}
                                                </td>
                                                <td className="td-center">
                                                    x{item.quantity}
                                                </td>
                                                <td className="td-right">
                                                    {rupiah(item.lineTotal)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="receipt-divider-dash" />
                                <div className="receipt-totals">
                                    <div>
                                        <span>Subtotal</span>
                                        <strong>
                                            {rupiah(receipt.subtotal)}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>Pajak</span>
                                        <strong>{rupiah(receipt.tax)}</strong>
                                    </div>
                                    {receipt.serviceCharge > 0 && (
                                        <div>
                                            <span>Biaya layanan</span>
                                            <strong>
                                                {rupiah(receipt.serviceCharge)}
                                            </strong>
                                        </div>
                                    )}
                                    <div className="receipt-grand-total">
                                        <span>TOTAL LUNAS</span>
                                        <strong>
                                            {rupiah(receipt.payment.amount)}
                                        </strong>
                                    </div>
                                    <div className="receipt-payment-info">
                                        <div>
                                            <span>Metode pembayaran</span>
                                            <strong>
                                                {receipt.payment.method.toUpperCase()}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Uang diterima</span>
                                            <strong>
                                                {receipt.payment.cashReceived !=
                                                null
                                                    ? rupiah(
                                                          receipt.payment
                                                              .cashReceived,
                                                      )
                                                    : 'Tidak tercatat'}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Kembalian</span>
                                            <strong>
                                                {receipt.payment.cashChange !=
                                                null
                                                    ? rupiah(
                                                          receipt.payment
                                                              .cashChange,
                                                      )
                                                    : 'Tidak tercatat'}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                                <div className="receipt-divider-dash" />
                                <div className="receipt-footer">
                                    <p>Terima kasih atas kunjungan Anda</p>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                size="medium"
                                variant="secondary"
                                onClick={close}
                            >
                                Tutup
                            </Button>
                            <Button
                                size="medium"
                                variant="primary"
                                leadingIcon={RiPrinterLine}
                                onClick={() => window.print()}
                            >
                                Cetak struk lunas
                            </Button>
                        </ModalFooter>
                    </>
                ) : null
            }
        </Modal>
    );
}

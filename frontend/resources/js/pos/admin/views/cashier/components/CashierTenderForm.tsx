import {
    RiCheckboxCircleLine,
    RiPrinterLine,
    RiMoneyDollarCircleLine,
} from '@remixicon/react';
import { Button } from '../../../../../../../components/base/buttons/button';
import { Input } from '../../../../../../../components/base/input/input';
import { cx } from '../../../../../../../utils/cx';
import type { AdminOrder } from '../../../runtime-data';
import type { useLocale } from '../../../i18n-context';

type PaymentMethod = 'cash' | 'qris' | 'transfer';
type CashPreset = 'pas' | 'exact' | number;
type PaymentOption = {
    key: PaymentMethod;
    label: string;
    icon: typeof RiMoneyDollarCircleLine;
};
type Props = {
    selectedOrder?: AdminOrder;
    paymentOptions: PaymentOption[];
    method: PaymentMethod;
    cashPreset: CashPreset;
    cashPresetOptions: number[];
    customCashInput: string;
    cashReceived: number;
    change: number;
    total: number;
    discountAmount: number;
    serverMode: boolean;
    locale: ReturnType<typeof useLocale>['locale'];
    t: ReturnType<typeof useLocale>['t'];
    formatRupiah: (value: number) => string;
    isSaving: boolean;
    canMarkPaid: boolean;
    onMethodChange: (method: PaymentMethod) => void;
    onPresetChange: (preset: CashPreset) => void;
    onCashInputChange: (value: string) => void;
    onPrintBill: () => void;
    onConfirmPayment: () => Promise<void>;
};

export function CashierTenderForm({
    selectedOrder,
    paymentOptions,
    method,
    cashPreset,
    cashPresetOptions,
    customCashInput,
    cashReceived,
    change,
    total,
    discountAmount,
    serverMode,
    locale,
    t,
    formatRupiah,
    isSaving,
    canMarkPaid,
    onMethodChange,
    onPresetChange,
    onCashInputChange,
    onPrintBill,
    onConfirmPayment,
}: Props) {
    return (
        <>
            {/* Payment Method Selector */}
            <div className="payment-methods">
                <h3>{t('cashier.paymentMethod')}</h3>
                <div>
                    {paymentOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                            <Button
                                className={
                                    method === option.key ? 'active' : ''
                                }
                                type="button"
                                key={option.key}
                                variant="secondary"
                                aria-pressed={method === option.key}
                                onClick={() => onMethodChange(option.key)}
                            >
                                <Icon aria-hidden="true" />
                                {option.label}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Quick Cash Presets (Only visible when method is Cash) */}
            {method === 'cash' && (
                <div className="cashier-quick-cash">
                    <span>{t('cashier.quickCash')}</span>
                    <div className="cash-preset-grid">
                        <Button
                            type="button"
                            variant="secondary"
                            aria-pressed={cashPreset === 'pas'}
                            className={cx(
                                'cash-preset-btn',
                                cashPreset === 'pas' && 'active',
                            )}
                            onClick={() => {
                                onPresetChange('pas');
                                onCashInputChange('');
                            }}
                        >
                            {t('cashier.exactAmount')}
                        </Button>
                        {cashPresetOptions.map((amt) => (
                            <Button
                                type="button"
                                key={amt}
                                variant="secondary"
                                aria-pressed={cashPreset === amt}
                                className={cx(
                                    'cash-preset-btn',
                                    cashPreset === amt && 'active',
                                )}
                                onClick={() => {
                                    onPresetChange(amt);
                                    onCashInputChange('');
                                }}
                            >
                                {formatRupiah(amt)}
                            </Button>
                        ))}
                    </div>
                    <div className="custom-cash-wrap">
                        <Input
                            aria-label={t('cashier.customAmount')}
                            type="text"
                            placeholder={t('cashier.customAmount')}
                            value={customCashInput}
                            onChange={(value) => {
                                onCashInputChange(value.replace(/[^0-9]/g, ''));
                                onPresetChange('exact');
                            }}
                            className="cashier-cash-input"
                            fieldClassName="cashier-field-focus"
                        />
                    </div>
                </div>
            )}

            {method === 'cash' ? (
                <div className="cashier-tendered">
                    <p>
                        <span>
                            {locale === 'id'
                                ? 'Uang diterima'
                                : 'Cash received'}
                        </span>
                        <strong>{formatRupiah(cashReceived)}</strong>
                    </p>
                    <p>
                        <span>{t('cashier.change')}</span>
                        <strong className={change > 0 ? 'text-change' : ''}>
                            {formatRupiah(change)}
                        </strong>
                    </p>
                </div>
            ) : (
                <div
                    className="cashier-tendered cashier-unverified-method"
                    aria-live="polite"
                >
                    <p>
                        <span>
                            {locale === 'id'
                                ? 'Status pembayaran'
                                : 'Payment status'}
                        </span>
                        <strong>
                            {locale === 'id'
                                ? 'Belum terverifikasi'
                                : 'Unverified'}
                        </strong>
                    </p>
                </div>
            )}

            {serverMode && selectedOrder?.orderNumber?.startsWith('DEMO-') && (
                <output className="cashier-safety-note">
                    {locale === 'id'
                        ? 'Mode demo development: pembayaran tunai tersimpan di database lokal sebagai transaksi uji, bukan penjualan operasional.'
                        : 'Development demo: cash payments are saved locally as tests, not operational sales.'}
                </output>
            )}
            {discountAmount > 0 && (
                <output className="cashier-safety-note">
                    {locale === 'id'
                        ? 'Diskon belum didukung server. Hapus diskon sebelum mencatat pembayaran.'
                        : 'The server does not support discounts yet. Clear the discount before recording payment.'}
                </output>
            )}
            <p className="cashier-safety-note" role="note">
                {locale === 'id'
                    ? serverMode
                        ? 'Pembayaran tunai baru dinyatakan lunas setelah tersimpan di Laravel.'
                        : 'Pencatatan pembayaran hanya berlaku untuk sesi ini dan belum tersimpan di server.'
                    : serverMode
                      ? 'Cash is marked paid only after Laravel saves the transaction.'
                      : 'Payment records apply only to this session and are not saved to the server yet.'}
            </p>
            {method !== 'cash' && (
                <output className="cashier-safety-note">
                    {locale === 'id'
                        ? 'QRIS dan transfer belum memiliki verifikasi pembayaran server; pesanan tidak dapat ditandai lunas dengan metode ini.'
                        : 'QRIS and bank transfers are not yet verified by the server; these methods cannot mark a bill as paid.'}
                </output>
            )}
            {method === 'cash' && cashReceived < total && (
                <output className="cashier-safety-note">
                    {locale === 'id'
                        ? 'Uang diterima belum mencukupi total tagihan.'
                        : 'Cash received is less than the amount due.'}
                </output>
            )}
            <div className="cashier-actions">
                <Button
                    variant="secondary"
                    size="medium"
                    leadingIcon={RiPrinterLine}
                    disabled={!selectedOrder?.id}
                    onClick={() => {
                        onPrintBill();
                    }}
                >
                    {t('cashier.printBill')}
                </Button>
                <Button
                    variant="primary"
                    size="medium"
                    leadingIcon={RiCheckboxCircleLine}
                    disabled={!canMarkPaid}
                    onClick={() => void onConfirmPayment()}
                >
                    {isSaving
                        ? locale === 'id'
                            ? 'Menyimpan pembayaran…'
                            : 'Saving payment…'
                        : locale === 'id'
                          ? 'Catat lunas (tunai)'
                          : 'Mark paid (cash)'}
                </Button>
            </div>
        </>
    );
}

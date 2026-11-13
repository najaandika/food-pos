import { useEffect, useMemo, useState } from 'react';
import {
    RiBankCardLine,
    RiBankLine,
    RiCoinsLine,
    RiCoupon3Line,
    RiFileList3Line,
    RiMoneyDollarCircleLine,
    RiQrCodeLine,
    RiTimeLine,
} from '@remixicon/react';
import { Button } from '../../../../../../components/base/buttons/button';
import { Badge } from '../../../../../../components/base/badges/badge';
import { Spinner } from '../../../../../../components/base/spinner/spinner';
import {
    StatCards,
    type Stat,
} from '../../../../../../components/application/dashboard/stat-cards';
import {
    SegmentedControl,
    SegmentedControlItem,
} from '../../../../../../components/base/segmented-control/segmented-control';
import { cx } from '../../../../../../utils/cx';
import { StatusChip } from '../orders/StatusChip';
import { cashierTicketMark } from './cashier-ticket-mark';

import { AdminTitle } from '../..';
import { formatRupiah } from '../../../lib/format';
import type { AdminOrder } from '../../runtime-data';
import type { PosSettings } from '../../../../lib/pos-types';

import type { AuthUser } from '../../auth';
import { useLocale } from '../../i18n-context';
import {
    CashierApiError,
    cashierDetail,
    type CashierStats,
} from './cashier-api';
import type { CashierPaymentOutcome } from './use-cashier-data';
import {
    calculateCashierAmounts,
    filterPaymentQueue,
    getCashPresetOptions,
    getCashReceived,
    getPayableOrders,
    getSelectedQueueOrder,
    type CashierFilter,
    type DiscountOption,
    type PaymentMethod,
} from './cashier-view-model';
import {
    CashierQueuePanel,
    CashierTenderForm,
    CashierBillPreviewModal,
} from './components';
// Display-only ownership moved with the queue and tender children:
// RiCheckboxCircleLine, RiCloseLine, RiSearchLine, RiPrinterLine.
// The parent retains selection, financial calculations and payment state.
import '../../styles/boardui-stats.css';

type CashierDraft = {
    orderId?: number;
    discount: DiscountOption;
    customCashInput: string;
    cashPreset: 'pas' | 'exact' | number;
};

const payableStatuses = ['ready', 'served', 'waiting_payment'] as const;

export function CashierView({
    orders = [],
    settings,
    onMarkPaid,
    user,
    serverMode = false,
    isLoading = false,
    isSaving = false,
    serverError = '',
    onRetry,
    cashierStats,
    pagination,
    onPageChange,
    onSearchChange,
    onFilterChange,
    confirmedOrderIds = [],
    receiptRecoveries = [],
}: {
    orders?: AdminOrder[];
    settings?: PosSettings;
    onMarkPaid?: (
        id: number,
        method?: PaymentMethod,
        cashReceived?: number,
        expectedTotal?: number,
    ) => Promise<CashierPaymentOutcome | void> | CashierPaymentOutcome | void;
    serverMode?: boolean;
    isLoading?: boolean;
    isSaving?: boolean;
    serverError?: string;
    onRetry?: () => void;
    cashierStats?: CashierStats | null;
    pagination?: { page: number; lastPage: number; total: number };
    onPageChange?: (page: number) => void;
    onSearchChange?: (value: string) => void;
    onFilterChange?: (value: CashierFilter) => void;
    confirmedOrderIds?: number[];
    receiptRecoveries?: Array<{
        orderId: number;
        error: string;
        isRetrying: boolean;
        isDisabled: boolean;
        onRetry: () => void;
    }>;
    user?: AuthUser;
    onLogout?: () => void;
}) {
    const { locale, t } = useLocale();

    const formatSource = (source?: AdminOrder['source']) => {
        if (source === 'manual') return t('orders.manualOrder');
        if (source === 'qr') return t('orders.qrTableOrdering');
        return '—';
    };

    const [selectedId, setSelectedId] = useState<number | undefined>(
        orders[0]?.id,
    );
    const [selectedMethod, setMethod] = useState<PaymentMethod>('cash');
    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<CashierFilter>('all');
    const [mobileTab, setMobileTab] = useState<'queue' | 'detail'>('queue');

    const [draft, setDraft] = useState<CashierDraft>({
        orderId: orders[0]?.id,
        discount: 'none',
        customCashInput: '',
        cashPreset: 'pas',
    });
    const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
    const [receiptOpenedAt, setReceiptOpenedAt] = useState<Date | null>(null);
    const [paymentError, setPaymentError] = useState('');
    const [paymentNotice, setPaymentNotice] = useState('');
    const [fetchedBill, setFetchedBill] = useState<AdminOrder | null>(null);
    const [billError, setBillError] = useState('');
    const [billRetry, setBillRetry] = useState(0);

    const payableOrders = useMemo(() => getPayableOrders(orders), [orders]);
    const paymentQueue = useMemo(
        () =>
            filterPaymentQueue(payableOrders, serverMode, query, activeFilter),
        [activeFilter, payableOrders, query, serverMode],
    );
    const queueOrder = getSelectedQueueOrder(paymentQueue, selectedId);
    useEffect(() => {
        if (!serverMode || !queueOrder?.id) return;
        const controller = new AbortController();
        void cashierDetail(queueOrder.id, controller.signal)
            .then((bill) => {
                if (!controller.signal.aborted) {
                    setFetchedBill(bill);
                    setBillError('');
                }
            })
            .catch((reason) => {
                if (!controller.signal.aborted) {
                    setBillError(
                        reason instanceof Error
                            ? reason.message
                            : 'Rincian tagihan gagal dimuat.',
                    );
                }
            });
        return () => controller.abort();
    }, [queueOrder?.id, queueOrder?.rawTotal, serverMode, billRetry]);
    const billReady =
        !serverMode || (fetchedBill?.id === queueOrder?.id && !billError);
    const selectedOrder =
        serverMode && billReady && fetchedBill ? fetchedBill : queueOrder;
    const selectedPayable = selectedOrder?.rawStatus
        ? payableStatuses.includes(
              selectedOrder.rawStatus as (typeof payableStatuses)[number],
          ) &&
          (selectedOrder.id == null ||
              !confirmedOrderIds.includes(selectedOrder.id))
        : false;

    // Draft values are scoped to a single bill, including when filters or
    // server refreshes change the effective selection without a click.
    const defaultDraft: CashierDraft = {
        orderId: selectedOrder?.id,
        discount: 'none',
        customCashInput: '',
        cashPreset: 'pas',
    };
    const activeDraft =
        draft.orderId === selectedOrder?.id ? draft : defaultDraft;
    const { discount, customCashInput, cashPreset } = activeDraft;
    const updateDraft = (changes: Partial<CashierDraft>) =>
        setDraft((previous) => ({
            ...(previous.orderId === selectedOrder?.id
                ? previous
                : defaultDraft),
            ...changes,
        }));
    const setDiscount = (value: DiscountOption) =>
        updateDraft({ discount: value });
    const setCustomCashInput = (value: string) =>
        updateDraft({ customCashInput: value });
    const setCashPreset = (value: CashierDraft['cashPreset']) =>
        updateDraft({ cashPreset: value });

    const paymentOptions = useMemo(
        () =>
            [
                {
                    key: 'cash' as const,
                    label: t('cashier.cash'),
                    icon: RiMoneyDollarCircleLine,
                    enabled: settings?.payments.cash ?? true,
                },
                {
                    key: 'qris' as const,
                    label: t('cashier.qris'),
                    icon: RiQrCodeLine,
                    enabled: settings?.payments.qris ?? true,
                },
                {
                    key: 'transfer' as const,
                    label: t('cashier.transfer'),
                    icon: RiBankCardLine,
                    enabled: settings?.payments.transfer ?? false,
                },
            ].filter((option) => option.enabled),
        [settings, t],
    );
    const method = paymentOptions.some(
        (option) => option.key === selectedMethod,
    )
        ? selectedMethod
        : (paymentOptions[0]?.key ?? 'cash');

    const {
        rawSubtotal,
        discountAmount,
        taxRate,
        serviceRate,
        tax,
        serviceCharge,
        total,
    } = calculateCashierAmounts(selectedOrder, discount, settings);
    const cashReceived = getCashReceived(
        total,
        method,
        cashPreset,
        customCashInput,
    );
    const change = Math.max(0, cashReceived - total);
    const cashPresetOptions = useMemo(
        () => getCashPresetOptions(total),
        [total],
    );

    const paidToday = orders.filter((order) => order.rawStatus === 'paid');
    const kpiCards: Stat[] = [
        {
            label: t('cashier.unpaidBills'),
            value: String(
                serverMode && cashierStats
                    ? cashierStats.unpaidCount +
                          (cashierStats.demoUnpaidCount ?? 0)
                    : payableOrders.length,
            ),
            hint:
                String(
                    serverMode && cashierStats
                        ? cashierStats.waitingCount +
                              (cashierStats.demoWaitingCount ?? 0)
                        : payableOrders.filter(
                              (order) => order.rawStatus === 'waiting_payment',
                          ).length,
                ) +
                ' ' +
                t('cashier.waitingPayment'),
            icon: RiTimeLine,
            deltaColor: 'neutral',
        },
        {
            label:
                locale === 'id'
                    ? 'Total lunas tercatat'
                    : 'Recorded paid total',
            value: formatRupiah(
                serverMode && cashierStats
                    ? Number(cashierStats.paidTotal)
                    : paidToday.reduce(
                          (sum, order) => sum + (order.rawTotal ?? 0),
                          0,
                      ),
            ),
            hint:
                String(
                    serverMode && cashierStats
                        ? cashierStats.paidCount
                        : paidToday.length,
                ) +
                ' ' +
                t('orders.all'),
            icon: RiCoinsLine,
            deltaColor: 'neutral',
        },
        {
            label: locale === 'id' ? 'Penjualan tunai' : 'Cash sales',
            value:
                serverMode && cashierStats
                    ? formatRupiah(Number(cashierStats.cashPaidTotal))
                    : '—',
            hint:
                serverMode && cashierStats
                    ? `${cashierStats.cashPaidCount} ${locale === 'id' ? 'pembayaran tunai' : 'cash payments'}`
                    : locale === 'id'
                      ? 'Belum terhubung ke pembayaran Laravel'
                      : 'Cash payments not connected',
            icon: RiBankLine,
            deltaColor: 'neutral',
        },
    ];

    // BoardUI Modal owns focus trap, Escape and focus restoration.

    // Cash is recorded only after Laravel confirms the payment row.
    // QRIS/transfer, discounts and insufficient cash remain blocked.
    const confirmMarkPaid = async () => {
        if (
            isSaving ||
            !billReady ||
            !selectedOrder?.id ||
            !onMarkPaid ||
            !selectedPayable ||
            discountAmount > 0 ||
            method !== 'cash' ||
            cashReceived < total
        )
            return;
        setPaymentError('');
        setPaymentNotice('');
        try {
            const outcome = await onMarkPaid(
                selectedOrder.id,
                'cash',
                cashReceived,
                total,
            );
            const currentIndex = paymentQueue.findIndex(
                (order) => order.id === selectedOrder.id,
            );
            const nextUnpaid =
                paymentQueue.find((order, index) => index > currentIndex) ??
                paymentQueue.find((order) => order.id !== selectedOrder.id);
            setSelectedId(nextUnpaid?.id);
            setMobileTab('queue');
            setPaymentNotice(
                outcome?.status === 'confirmed' &&
                    outcome.receiptStatus === 'unavailable'
                    ? locale === 'id'
                        ? 'Pembayaran tunai sudah tercatat di Laravel. Struk belum tersedia; muat ulang struk tanpa membayar ulang.'
                        : 'Cash payment is recorded in Laravel. The receipt is unavailable; reload the receipt without paying again.'
                    : serverMode
                      ? locale === 'id'
                          ? 'Pembayaran tunai berhasil dicatat di Laravel.'
                          : 'Cash payment was saved to Laravel.'
                      : locale === 'id'
                        ? 'Pembayaran tunai dicatat untuk sesi lokal saja.'
                        : 'Cash payment recorded in the local session only.',
            );
        } catch (reason) {
            if (
                serverMode &&
                reason instanceof CashierApiError &&
                reason.status === 409
            ) {
                setBillRetry((value) => value + 1);
                onRetry?.();
            }
            setPaymentError(
                reason instanceof Error
                    ? reason.message
                    : 'Gagal mencatat pembayaran. Periksa data dan coba lagi.',
            );
        }
    };

    return (
        <section className="app-view active cashier-workspace">
            {isLoading && (
                <div
                    className="border-border-button-default bg-background-secondary-default text-body-2-regular text-text-secondary mb-3 flex items-center gap-3 rounded-xl border px-4 py-3"
                    aria-live="polite"
                >
                    <Spinner size="md" aria-label="Memuat transaksi" />
                    {locale === 'id'
                        ? 'Memuat pesanan dan tagihan dari Laravel…'
                        : 'Loading orders and bills from Laravel…'}
                </div>
            )}
            {receiptRecoveries.map((receiptRecovery) => (
                <div
                    key={receiptRecovery.orderId}
                    className="border-border-button-default bg-background-secondary-default text-body-2-regular text-text-primary mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    role="status"
                    aria-live="polite"
                >
                    <div>
                        <strong>
                            {locale === 'id'
                                ? `Pembayaran pesanan #${receiptRecovery.orderId} sudah tercatat.`
                                : `Payment for order #${receiptRecovery.orderId} is confirmed.`}
                        </strong>
                        <p>
                            {locale === 'id'
                                ? 'Struk belum tersedia. Jangan catat pembayaran ulang. Muat ulang struk saja melalui GET.'
                                : 'Receipt unavailable. Do not charge again. Reload the receipt only.'}
                        </p>
                        <p>{receiptRecovery.error}</p>
                    </div>
                    <Button
                        variant="secondary"
                        size="small"
                        disabled={receiptRecovery.isDisabled}
                        onClick={receiptRecovery.onRetry}
                    >
                        {receiptRecovery.isRetrying
                            ? locale === 'id'
                                ? 'Memuat struk…'
                                : 'Loading receipt…'
                            : locale === 'id'
                              ? 'Muat ulang struk'
                              : 'Reload receipt'}
                    </Button>
                </div>
            ))}
            {(serverError || paymentError || billError) && (
                <div
                    className="border-border-button-default bg-background-secondary-default text-body-2-regular text-text-primary mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    role="alert"
                >
                    <span>{paymentError || billError || serverError}</span>
                    {(serverError || billError) && (onRetry || billError) && (
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => {
                                if (billError) {
                                    setBillRetry((value) => value + 1);
                                }
                                onRetry?.();
                            }}
                        >
                            {locale === 'id' ? 'Coba lagi' : 'Try again'}
                        </Button>
                    )}
                </div>
            )}
            {paymentNotice && !serverError && !paymentError && (
                <output className="border-border-button-default bg-background-secondary-default text-body-2-regular text-text-primary mb-3 rounded-xl border px-4 py-3">
                    {paymentNotice}
                </output>
            )}
            <header className="topbar">
                <AdminTitle
                    title={t('cashier.title')}
                    subtitle={t('cashier.subtitle')}
                />
            </header>

            {/* Mobile Screen Navigation Segmented Switcher */}
            <SegmentedControl
                className="cashier-mobile-tabs cashier-mobile-segments"
                variant="solid"
                aria-label={
                    locale === 'id' ? 'Tampilan kasir' : 'Cashier panels'
                }
                selectedKeys={new Set([mobileTab])}
                onSelectionChange={(keys) => {
                    const next = Array.from(keys)[0];
                    if (next === 'queue' || next === 'detail') {
                        setMobileTab(next);
                    }
                }}
            >
                <SegmentedControlItem
                    id="queue"
                    className="cashier-mobile-choice"
                >
                    {t('cashier.paymentQueue')} ({paymentQueue.length})
                </SegmentedControlItem>
                <SegmentedControlItem
                    id="detail"
                    className="cashier-mobile-choice"
                >
                    {t('cashier.billDetail')}
                </SegmentedControlItem>
            </SegmentedControl>

            <section
                className="cashier-kpi-section"
                aria-label={
                    locale === 'id'
                        ? 'Ringkasan transaksi kasir'
                        : 'Cashier transaction summary'
                }
            >
                <StatCards
                    variant="plain"
                    columns={3}
                    stats={kpiCards}
                    className="cashier-kpi-row"
                />
                <p className="cashier-kpi-disclaimer">
                    {serverMode
                        ? locale === 'id'
                            ? 'Menampilkan transaksi dari Laravel.'
                            : 'Showing transactions from Laravel.'
                        : locale === 'id'
                          ? 'Ringkasan sesi lokal; belum tersinkron dengan pembayaran Laravel.'
                          : 'Local session summary; not synced with Laravel payments.'}
                </p>
                {serverMode && (cashierStats?.demoUnpaidCount ?? 0) > 0 && (
                    <p className="text-body-2-regular text-text-secondary flex flex-wrap items-center gap-2">
                        <Badge
                            color="neutral"
                            className="bg-status-yellow-background text-status-yellow-text"
                        >
                            {locale === 'id' ? 'Latihan' : 'Training'}
                        </Badge>
                        {locale === 'id'
                            ? `${cashierStats?.demoUnpaidCount} pesanan latihan tersedia. Ringkasan pendapatan hanya menghitung transaksi operasional.`
                            : `${cashierStats?.demoUnpaidCount} training orders are available. Revenue totals count operational transactions only.`}
                    </p>
                )}
            </section>

            <div className="cashier-layout">
                <CashierQueuePanel
                    mobileTab={mobileTab}
                    paymentQueue={paymentQueue}
                    payableOrders={payableOrders}
                    selectedOrder={selectedOrder}
                    query={query}
                    activeFilter={activeFilter}
                    locale={locale}
                    t={t}
                    formatSource={formatSource}
                    serverMode={serverMode}
                    serverError={serverError}
                    isLoading={isLoading}
                    pagination={pagination}
                    onPageChange={onPageChange}
                    onFilterSelect={(value) => {
                        setActiveFilter(value);
                        onFilterChange?.(value);
                    }}
                    onQueryChange={(value) => {
                        setQuery(value);
                        onSearchChange?.(value);
                    }}
                    onSelectOrder={(id) => {
                        setSelectedId(id);
                        setMobileTab('detail');
                    }}
                    onReset={() => {
                        setQuery('');
                        setActiveFilter('all');
                        onSearchChange?.('');
                        onFilterChange?.('all');
                    }}
                />

                <aside
                    className={cx(
                        'cashier-detail',
                        mobileTab === 'queue' && 'mobile-hidden',
                    )}
                >
                    {selectedOrder ? (
                        <>
                            <div className="cashier-detail-top">
                                <div className="cashier-customer-head">
                                    <span
                                        className="cashier-ticket-mark"
                                        title={
                                            selectedOrder.orderNumber ??
                                            undefined
                                        }
                                    >
                                        <span aria-hidden="true">
                                            {cashierTicketMark(
                                                selectedOrder.orderNumber,
                                            )}
                                        </span>
                                        <span className="sr-only">
                                            {locale === 'id'
                                                ? 'Nomor pesanan'
                                                : 'Order number'}{' '}
                                            {selectedOrder.orderNumber ?? '—'}
                                        </span>
                                    </span>
                                    <div>
                                        <StatusChip
                                            variant="caption"
                                            status={selectedOrder.rawStatus}
                                            fallbackLabel={selectedOrder.status}
                                            className="cashier-detail-status"
                                        />
                                        <h2>
                                            {selectedOrder?.name ??
                                                t('cashier.selectOrder')}
                                        </h2>
                                        {serverMode &&
                                            selectedOrder.orderNumber?.startsWith(
                                                'DEMO-',
                                            ) && (
                                                <Badge
                                                    color="neutral"
                                                    className="bg-status-yellow-background text-status-yellow-text"
                                                >
                                                    {locale === 'id'
                                                        ? 'Latihan'
                                                        : 'Training'}
                                                </Badge>
                                            )}
                                        <p>
                                            {selectedOrder?.meta} -{' '}
                                            {selectedOrder?.time}
                                        </p>
                                    </div>
                                </div>
                                <span className="cashier-table-badge">
                                    <small>{t('common.table')}</small>
                                    <strong>
                                        {selectedOrder?.table ?? '-'}
                                    </strong>
                                </span>
                            </div>

                            <div className="payment-due-card">
                                <span>{t('cashier.amountDue')}</span>
                                <strong>{formatRupiah(total)}</strong>
                                <small>
                                    {locale === 'id'
                                        ? 'Termasuk pajak, servis & diskon yang berlaku'
                                        : 'Includes tax, service & applied discounts'}
                                </small>
                            </div>

                            <div className="cashier-note-grid">
                                <article>
                                    <span>{t('orders.source')}</span>
                                    <strong>
                                        {formatSource(selectedOrder?.source)}
                                    </strong>
                                </article>
                                <article>
                                    <span>
                                        {locale === 'id'
                                            ? 'Status Pembayaran'
                                            : 'Payment Status'}
                                    </span>
                                    <strong>
                                        {selectedOrder?.rawStatus === 'paid'
                                            ? t('status.paid')
                                            : t('orders.unpaid')}
                                    </strong>
                                </article>
                            </div>

                            {/* Quick Discount Selector */}
                            <div className="cashier-discount-box">
                                <div className="cashier-discount-title">
                                    <RiCoupon3Line
                                        aria-hidden="true"
                                        size={15}
                                    />
                                    <span>{t('cashier.discountVoucher')}</span>
                                </div>
                                <div className="cashier-discount-chips">
                                    {[
                                        ['none', t('cashier.noDiscount')],
                                        ['10', '10% Off'],
                                        ['15', '15% Off'],
                                        ['20', '20% Off'],
                                        ['v10k', '-Rp 10k'],
                                        ['v20k', '-Rp 20k'],
                                    ].map(([key, label]) => (
                                        <Button
                                            type="button"
                                            key={key}
                                            variant={
                                                discount === key
                                                    ? 'primary'
                                                    : 'secondary'
                                            }
                                            aria-pressed={discount === key}
                                            className={cx(
                                                'discount-chip',
                                                discount === key && 'active',
                                            )}
                                            onClick={() =>
                                                setDiscount(
                                                    key as DiscountOption,
                                                )
                                            }
                                        >
                                            {label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="cashier-section-title">
                                <h3>{t('cashier.billItems')}</h3>
                                <span>
                                    {selectedOrder?.items.length ?? 0}{' '}
                                    {t('common.items')}
                                </span>
                            </div>

                            <div className="cashier-items">
                                {(selectedOrder?.items ?? []).map(
                                    ([name, qty, price], index) => (
                                        <div
                                            key={`${selectedOrder?.id ?? selectedOrder?.orderNumber}-${name}-${index}`}
                                        >
                                            <span>{name}</span>
                                            <b>x{qty}</b>
                                            <strong>{price}</strong>
                                        </div>
                                    ),
                                )}
                            </div>

                            <div className="cashier-bill">
                                <p>
                                    <span>{t('cashier.subtotal')}</span>
                                    <strong>{formatRupiah(rawSubtotal)}</strong>
                                </p>
                                {discountAmount > 0 && (
                                    <p className="cashier-discount-row">
                                        <span>{t('cashier.discount')}</span>
                                        <strong className="text-discount">
                                            -{formatRupiah(discountAmount)}
                                        </strong>
                                    </p>
                                )}
                                <p>
                                    <span>
                                        {t('cashier.tax')} ({taxRate}%)
                                    </span>
                                    <strong>{formatRupiah(tax)}</strong>
                                </p>
                                {(serviceRate > 0 || serviceCharge > 0) && (
                                    <p>
                                        <span>
                                            {t('cashier.serviceCharge')} (
                                            {serviceRate}
                                            %)
                                        </span>
                                        <strong>
                                            {formatRupiah(serviceCharge)}
                                        </strong>
                                    </p>
                                )}
                                <p className="cashier-bill-total">
                                    <span>{t('cashier.grandTotal')}</span>
                                    <strong>{formatRupiah(total)}</strong>
                                </p>
                            </div>

                            <CashierTenderForm
                                selectedOrder={selectedOrder}
                                paymentOptions={paymentOptions}
                                method={method}
                                cashPreset={cashPreset}
                                cashPresetOptions={cashPresetOptions}
                                customCashInput={customCashInput}
                                cashReceived={cashReceived}
                                change={change}
                                total={total}
                                discountAmount={discountAmount}
                                serverMode={serverMode}
                                locale={locale}
                                t={t}
                                formatRupiah={formatRupiah}
                                isSaving={isSaving}
                                canMarkPaid={Boolean(
                                    selectedOrder?.id &&
                                    onMarkPaid &&
                                    selectedPayable &&
                                    paymentOptions.length > 0 &&
                                    discountAmount === 0 &&
                                    method === 'cash' &&
                                    cashReceived >= total &&
                                    !isSaving &&
                                    billReady &&
                                    !isLoading &&
                                    !serverError,
                                )}
                                onMethodChange={setMethod}
                                onPresetChange={setCashPreset}
                                onCashInputChange={setCustomCashInput}
                                onPrintBill={() => {
                                    setReceiptOpenedAt(new Date());
                                    setShowReceiptModal(true);
                                }}
                                onConfirmPayment={confirmMarkPaid}
                            />
                        </>
                    ) : (
                        <div
                            className="cashier-detail-empty"
                            aria-live="polite"
                        >
                            <RiFileList3Line aria-hidden="true" />
                            <h2>{t('cashier.selectOrder')}</h2>
                            <p>
                                {locale === 'id'
                                    ? 'Belum ada tagihan sesuai pencarian atau filter. Pilih pesanan dari antrian untuk melihat rincian pembayaran.'
                                    : 'No bills match the current search or filter. Select an order from the queue to view payment details.'}
                            </p>
                        </div>
                    )}
                </aside>
            </div>

            {/* BoardUI dialog with its native focus trap and focus restoration.
                The paper remains printable but never claims verified payment. */}
            <CashierBillPreviewModal
                selectedOrder={selectedOrder}
                showReceiptModal={showReceiptModal}
                setShowReceiptModal={setShowReceiptModal}
                receiptOpenedAt={receiptOpenedAt}
                settings={settings}
                user={user}
                locale={locale}
                t={t}
                formatRupiah={formatRupiah}
                totals={{
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
                }}
            />
        </section>
    );
}

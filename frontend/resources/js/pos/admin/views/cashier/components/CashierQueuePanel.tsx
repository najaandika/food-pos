import {
    RiCheckboxCircleLine,
    RiCloseLine,
    RiSearchLine,
} from '@remixicon/react';
import { Button } from '../../../../../../../components/base/buttons/button';
import { Badge } from '../../../../../../../components/base/badges/badge';
import { StatusChip } from '../../orders/StatusChip';
import { Input } from '../../../../../../../components/base/input/input';
import {
    SegmentedControl,
    SegmentedControlItem,
} from '../../../../../../../components/base/segmented-control/segmented-control';
import { cx } from '../../../../../../../utils/cx';
import type { AdminOrder } from '../../../runtime-data';
import type { useLocale } from '../../../i18n-context';

type CashierFilter = 'all' | 'ready' | 'qr' | 'takeaway';
type Props = {
    mobileTab: 'queue' | 'detail';
    paymentQueue: AdminOrder[];
    payableOrders: AdminOrder[];
    selectedOrder?: AdminOrder;
    query: string;
    activeFilter: CashierFilter;
    locale: ReturnType<typeof useLocale>['locale'];
    t: ReturnType<typeof useLocale>['t'];
    formatSource: (source?: AdminOrder['source']) => string;
    serverMode: boolean;
    serverError: string;
    isLoading: boolean;
    pagination?: { page: number; lastPage: number; total: number };
    onPageChange?: (page: number) => void;
    onFilterSelect: (value: CashierFilter) => void;
    onQueryChange: (value: string) => void;
    onSelectOrder: (id: number | undefined) => void;
    onReset: () => void;
};

export function CashierQueuePanel({
    mobileTab,
    paymentQueue,
    payableOrders,
    selectedOrder,
    query,
    activeFilter,
    locale,
    t,
    formatSource,
    serverMode,
    serverError,
    isLoading,
    pagination,
    onPageChange,
    onFilterSelect,
    onQueryChange,
    onSelectOrder,
    onReset,
}: Props) {
    return (
        <section
            className={cx(
                'cashier-feed',
                mobileTab === 'detail' && 'mobile-hidden',
            )}
        >
            <div className="cashier-panel">
                <div className="cashier-panel-head">
                    <div>
                        <h2>{t('cashier.paymentQueue')}</h2>
                        <p>{t('cashier.readyForPayment')}</p>
                    </div>
                    <span className="cashier-queue-count">
                        {paymentQueue.length} /{' '}
                        {serverMode && pagination
                            ? pagination.total
                            : payableOrders.length}
                    </span>
                </div>
                <div className="cashier-toolbar">
                    <SegmentedControl
                        variant="solid"
                        className="cashier-queue-segments"
                        aria-label={
                            locale === 'id'
                                ? 'Filter antrian pembayaran'
                                : 'Payment queue filter'
                        }
                        selectedKeys={new Set([activeFilter])}
                        onSelectionChange={(keys) => {
                            const next = Array.from(keys)[0];
                            if (
                                next === 'all' ||
                                next === 'ready' ||
                                next === 'qr' ||
                                next === 'takeaway'
                            ) {
                                onFilterSelect(next);
                            }
                        }}
                    >
                        <SegmentedControlItem id="all">
                            {t('cashier.allBills')}
                        </SegmentedControlItem>
                        <SegmentedControlItem id="ready">
                            {t('cashier.readyBills')}
                        </SegmentedControlItem>
                        <SegmentedControlItem id="qr">
                            {t('cashier.qrBills')}
                        </SegmentedControlItem>
                        <SegmentedControlItem id="takeaway">
                            {t('cashier.takeawayBills')}
                        </SegmentedControlItem>
                    </SegmentedControl>
                    <div className="cashier-search-shell">
                        <Input
                            aria-label={t('cashier.searchBill')}
                            type="search"
                            placeholder={t('cashier.searchBill')}
                            value={query}
                            onChange={(value) => {
                                onQueryChange(value);
                            }}
                            leadingIcon={RiSearchLine}
                            className="cashier-search-input"
                            fieldClassName="cashier-field-focus"
                        />
                        {query && (
                            <Button
                                variant="ghost"
                                size="small"
                                iconOnly
                                leadingIcon={RiCloseLine}
                                aria-label={
                                    locale === 'id'
                                        ? 'Hapus pencarian'
                                        : 'Clear search'
                                }
                                onClick={() => {
                                    onQueryChange('');
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className="cashier-order-list">
                    {paymentQueue.map((order) => (
                        <button
                            className="cashier-order-row"
                            type="button"
                            aria-pressed={order.id === selectedOrder?.id}
                            key={order.id ?? `${order.table}-${order.name}`}
                            onClick={() => {
                                onSelectOrder(order.id);
                            }}
                        >
                            <span className={cx('table-pill', order.tone)}>
                                {order.table}
                            </span>
                            <div>
                                <span className="cashier-order-customer flex min-w-0 items-center gap-2">
                                    <strong>{order.name}</strong>
                                    {serverMode &&
                                        order.orderNumber?.startsWith(
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
                                    {order.id === selectedOrder?.id && (
                                        <RiCheckboxCircleLine
                                            className="text-accent-500 size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                    )}
                                </span>
                                <small>{order.meta}</small>
                                <i>{formatSource(order.source)}</i>
                            </div>
                            <StatusChip
                                variant="caption"
                                status={order.rawStatus}
                                fallbackLabel={order.status}
                                className={cx(
                                    'cashier-boardui-status',
                                    order.statusTone,
                                )}
                            />
                            <span className="cashier-row-time">
                                {order.time}
                            </span>
                            <b>{order.total}</b>
                        </button>
                    ))}
                    {paymentQueue.length === 0 && (
                        <div className="cashier-empty-queue">
                            <RiCheckboxCircleLine aria-hidden="true" />
                            <strong>{t('cashier.noOrders')}</strong>
                            {serverMode &&
                                !serverError &&
                                !isLoading &&
                                !query &&
                                activeFilter === 'all' && (
                                    <p className="text-body-2-regular text-text-secondary">
                                        {locale === 'id'
                                            ? 'Belum ada pesanan yang siap dibayar. Buat pesanan dari Menu dan lanjutkan statusnya melalui Orders.'
                                            : 'No bills are ready. Create an order in Menu and progress its status through Orders.'}
                                    </p>
                                )}
                            {(query || activeFilter !== 'all') && (
                                <Button
                                    size="small"
                                    variant="secondary"
                                    onClick={() => {
                                        onReset();
                                    }}
                                >
                                    {locale === 'id'
                                        ? 'Reset pencarian & filter'
                                        : 'Clear search & filters'}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                {serverMode && pagination && pagination.lastPage > 1 && (
                    <nav
                        className="cashier-pagination"
                        aria-label="Halaman antrian kasir"
                    >
                        <Button
                            variant="secondary"
                            size="small"
                            disabled={pagination.page <= 1 || isLoading}
                            onClick={() => onPageChange?.(pagination.page - 1)}
                        >
                            Sebelumnya
                        </Button>
                        <span>
                            Halaman {pagination.page} dari {pagination.lastPage}
                        </span>
                        <Button
                            variant="secondary"
                            size="small"
                            disabled={
                                pagination.page >= pagination.lastPage ||
                                isLoading
                            }
                            onClick={() => onPageChange?.(pagination.page + 1)}
                        >
                            Berikutnya
                        </Button>
                    </nav>
                )}
            </div>
        </section>
    );
}

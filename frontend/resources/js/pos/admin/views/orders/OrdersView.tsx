import { useMemo, useState } from 'react';
import {
    createOrdersViewModel,
    filterWorkspaceOrders,
    type StageFilter,
    type SourceFilter,
} from './orders-view-model';
import {
    RiCloseLine,
    RiErrorWarningLine,
    RiFileList3Line,
    RiLayoutColumnLine,
    RiListCheck2,
} from '@remixicon/react';
import { Button } from '../../../../../../components/base/buttons/button';
import {
    SegmentedControl,
    SegmentedControlItem,
} from '../../../../../../components/base/segmented-control/segmented-control';
import {
    PillTab,
    PillTabList,
} from '../../../../../../components/base/tabs/pill-tab';
import { SearchField } from '../../../../../../components/base/search-field/search-field';
import {
    Select,
    SelectItem,
} from '../../../../../../components/base/select/select';
import { cx } from '../../../../../../utils/cx';
import type { PosOrderStatus, UserRole } from '@/lib/pos-types';
import type { AdminOrder } from '../../runtime-data';
import { AdminTitle } from '../..';
import { useLocale } from '../../i18n-context';
import { OrdersBoard } from './OrdersBoard';
import { OrdersList } from './OrdersList';
import { OrderDetail } from './OrderDetail';
import { Drawer } from '../../../../../../components/base/drawer/drawer';
import {
    Skeleton,
    SkeletonText,
} from '../../../../../../components/base/skeleton/skeleton';
import { Spinner } from '../../../../../../components/base/spinner/spinner';
import { StatCards } from '../../../../../../components/application/dashboard/stat-cards';
import { nextOrderStatus, orderIdentity, orderStatusLabel } from './order-ui';

type DisplayMode = 'board' | 'list';

export function OrdersView({
    role = 'owner',
    orders = [],
    initialSelectedOrderKey = null,
    onUpdateStatus,
    isSaving = false,
    isLoading = false,
    error,
    onRetry,
}: {
    role?: UserRole;
    orders?: AdminOrder[];
    initialSelectedOrderKey?: string | null;
    onUpdateStatus?: (
        orderId: number | undefined,
        status: PosOrderStatus,
    ) => Promise<void> | void;
    isSaving?: boolean;
    /** Initial Laravel request loading state. */
    isLoading?: boolean;
    /** Actual Laravel Orders API errors. */
    error?: string | null;
    onRetry?: () => void;
}) {
    const { locale, t } = useLocale();
    const isId = locale === 'id';
    const [stageFilter, setStageFilter] = useState<StageFilter>('active');
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<DisplayMode>('board');
    const [selectedKey, setSelectedKey] = useState<string | null>(
        initialSelectedOrderKey,
    );
    const [feedback, setFeedback] = useState('');

    const visibleOrders = useMemo(
        () =>
            filterWorkspaceOrders(
                orders,
                stageFilter,
                sourceFilter,
                query,
                locale,
            ),
        [orders, stageFilter, sourceFilter, query, locale],
    );

    const selectedOrder =
        selectedKey === null
            ? undefined
            : orders.find((order) => orderIdentity(order) === selectedKey);
    const hasFilters =
        stageFilter !== 'active' ||
        sourceFilter !== 'all' ||
        query.trim() !== '';
    const clearFilters = () => {
        setStageFilter('active');
        setSourceFilter('all');
        setQuery('');
    };

    const {
        countStatus,
        activeCount,
        paidCount,
        cancelledCount,
        kpiStats,
        stageTabs,
        extraStatuses,
        sourceTabs,
        columns,
    } = createOrdersViewModel(orders, visibleOrders, stageFilter, isId, t);

    const openOrder = (order: AdminOrder) => {
        setSelectedKey(orderIdentity(order));
        setFeedback('');
    };
    const advanceOrder = async (order: AdminOrder) => {
        const next = nextOrderStatus(role, order.rawStatus);
        if (!onUpdateStatus || !next || order.id == null || isSaving) return;
        try {
            await onUpdateStatus(order.id, next);
            setSelectedKey(null);
            setFeedback(
                isId
                    ? 'Status pesanan berhasil disimpan di Laravel.'
                    : 'Order status successfully saved to Laravel.',
            );
        } catch {
            // Keep the Drawer and original status until Laravel confirms.
            // The server wrapper displays the specific API error and retry.
        }
    };

    return (
        <section className="app-view active orders-workspace">
            <header className="topbar compact orders-page-topbar">
                <AdminTitle
                    title={t('orders.title')}
                    subtitle={t('orders.subtitle')}
                />
                <span className="orders-page-date text-caption-1-medium text-text-secondary">
                    {new Intl.DateTimeFormat(isId ? 'id-ID' : 'en-US', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                    }).format(new Date())}
                </span>
            </header>

            <section
                aria-label={isId ? 'Ringkasan pesanan' : 'Orders overview'}
            >
                <StatCards
                    variant="plain"
                    columns={4}
                    stats={kpiStats}
                    className="orders-kpi-grid"
                />
            </section>

            <section
                className="orders-controls"
                aria-label={
                    isId
                        ? 'Filter dan tampilan pesanan'
                        : 'Order filters and views'
                }
            >
                <div className="orders-controls-heading">
                    <div>
                        <span className="orders-eyebrow text-caption-2-bold text-text-secondary">
                            {isId ? 'OPERASIONAL PESANAN' : 'ORDER OPERATIONS'}
                        </span>
                        <h2>
                            {isId
                                ? 'Antrean & progres pesanan'
                                : 'Order queue & progress'}
                        </h2>
                        <p>
                            {isId
                                ? activeCount +
                                  ' aktif · ' +
                                  paidCount +
                                  ' lunas · ' +
                                  cancelledCount +
                                  ' dibatalkan'
                                : activeCount +
                                  ' active · ' +
                                  paidCount +
                                  ' paid · ' +
                                  cancelledCount +
                                  ' cancelled'}
                        </p>
                    </div>
                    <SegmentedControl
                        className="orders-view-switch"
                        aria-label={isId ? 'Pilih tampilan' : 'Choose view'}
                        selectedKeys={new Set([mode])}
                        onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0];
                            if (selected === 'board' || selected === 'list') {
                                setMode(selected);
                            }
                        }}
                    >
                        <SegmentedControlItem id="board">
                            <RiLayoutColumnLine
                                aria-hidden="true"
                                className="orders-view-icon"
                            />
                            {isId ? 'Papan' : 'Board'}
                        </SegmentedControlItem>
                        <SegmentedControlItem id="list">
                            <RiListCheck2
                                aria-hidden="true"
                                className="orders-view-icon"
                            />
                            {isId ? 'Daftar' : 'List'}
                        </SegmentedControlItem>
                    </SegmentedControl>
                </div>
                <div className="orders-primary-filters">
                    <PillTabList
                        className="orders-stage-filters"
                        aria-label={
                            isId
                                ? 'Filter status pesanan'
                                : 'Order status filters'
                        }
                    >
                        {stageTabs.map(({ key, label, count }) => (
                            <PillTab
                                key={key}
                                variant="blue"
                                isSelected={stageFilter === key}
                                onSelect={() => setStageFilter(key)}
                                className="orders-stage-filter"
                            >
                                {label}
                                <span className="orders-filter-count text-caption-2-semibold">
                                    {count}
                                </span>
                            </PillTab>
                        ))}
                    </PillTabList>
                    <Select
                        className="orders-more-statuses"
                        triggerClassName="orders-more-statuses-trigger"
                        size="sm"
                        aria-label={
                            isId
                                ? 'Filter status lainnya'
                                : 'Filter other statuses'
                        }
                        placeholder={isId ? 'Status' : 'Status'}
                        selectedKey={
                            extraStatuses.includes(
                                stageFilter as PosOrderStatus,
                            )
                                ? stageFilter
                                : null
                        }
                        onSelectionChange={(key) => {
                            if (key != null)
                                setStageFilter(String(key) as PosOrderStatus);
                        }}
                    >
                        {extraStatuses.map((status) => (
                            <SelectItem
                                id={status}
                                key={status}
                                textValue={orderStatusLabel(status, t)}
                            >
                                {orderStatusLabel(status, t)} (
                                {countStatus(status)})
                            </SelectItem>
                        ))}
                    </Select>
                </div>
                <div className="orders-secondary-filters">
                    <PillTabList
                        className="orders-source-filters"
                        aria-label={
                            isId
                                ? 'Filter sumber pesanan'
                                : 'Order source filters'
                        }
                    >
                        {sourceTabs.map(({ key, label }) => (
                            <PillTab
                                key={key}
                                variant="gray"
                                isSelected={sourceFilter === key}
                                onSelect={() => setSourceFilter(key)}
                            >
                                {label}
                            </PillTab>
                        ))}
                    </PillTabList>
                    <div className="orders-search-row">
                        <SearchField
                            size="medium"
                            shape="rounded"
                            className="orders-search-input"
                            isLoading={isLoading}
                            aria-label={
                                isId
                                    ? 'Cari nomor, meja, pelanggan, atau item pesanan'
                                    : 'Search order number, table, customer or item'
                            }
                            placeholder={
                                isId
                                    ? 'Cari nomor, meja, pelanggan, item…'
                                    : 'Search number, table, guest, item…'
                            }
                            clearLabel={
                                isId ? 'Bersihkan pencarian' : 'Clear search'
                            }
                            value={query}
                            onChange={setQuery}
                        />
                        {hasFilters && (
                            <Button
                                size="small"
                                variant="ghost"
                                className="orders-reset-filter"
                                onClick={clearFilters}
                            >
                                {isId ? 'Reset' : 'Clear'}
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            {feedback && (
                <div
                    className="orders-feedback text-caption-1-regular text-text-secondary"
                    role="status"
                >
                    <RiInformationLineIcon />
                    <span>{feedback}</span>
                    <Button
                        variant="ghost"
                        size="small"
                        iconOnly
                        leadingIcon={RiCloseLine}
                        aria-label={t('common.close')}
                        onClick={() => setFeedback('')}
                    />
                </div>
            )}

            {isLoading ? (
                <section
                    className="orders-system-state"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                >
                    <span className="orders-system-icon">
                        <Spinner
                            size="lg"
                            aria-label={isId ? 'Memuat' : 'Loading'}
                        />
                    </span>
                    <h2>{isId ? 'Memuat pesanan…' : 'Loading orders…'}</h2>
                    <p>
                        {isId
                            ? 'Menyiapkan daftar pesanan yang tersedia.'
                            : 'Preparing the available order list.'}
                    </p>
                    <div
                        className="orders-boardui-skeleton-preview"
                        aria-hidden="true"
                    >
                        <Skeleton
                            shape="rect"
                            className="orders-skeleton-icon"
                        />
                        <SkeletonText
                            lines={3}
                            className="orders-skeleton-lines"
                        />
                    </div>
                </section>
            ) : error ? (
                <section className="orders-system-state" role="alert">
                    <span className="orders-system-icon is-error">
                        <RiErrorWarningLine aria-hidden="true" />
                    </span>
                    <h2>
                        {isId
                            ? 'Pesanan tidak dapat ditampilkan'
                            : 'Unable to load orders'}
                    </h2>
                    <p>{error}</p>
                    {onRetry && (
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={onRetry}
                        >
                            {isId ? 'Coba lagi' : 'Try again'}
                        </Button>
                    )}
                </section>
            ) : visibleOrders.length === 0 ? (
                <section
                    className="orders-system-state orders-no-results"
                    role="status"
                >
                    <span className="orders-system-icon">
                        <RiFileList3Line aria-hidden="true" />
                    </span>
                    <h2>
                        {orders.length === 0
                            ? isId
                                ? 'Belum ada pesanan'
                                : 'No orders available'
                            : isId
                              ? 'Pesanan tidak ditemukan'
                              : 'No matching orders'}
                    </h2>
                    <p>
                        {orders.length === 0
                            ? isId
                                ? 'Daftar kosong. Belum ada data yang diterima dari sumber pesanan.'
                                : 'The list is empty. No orders were provided.'
                            : isId
                              ? 'Ubah kata kunci, sumber, atau status yang dipilih.'
                              : 'Try different search, source, or status filters.'}
                    </p>
                    {hasFilters && (
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={clearFilters}
                        >
                            {isId ? 'Reset filter' : 'Clear filters'}
                        </Button>
                    )}
                </section>
            ) : (
                <div
                    className={cx(
                        'orders-results',
                        mode === 'list' && 'is-list',
                    )}
                >
                    <div className="orders-results-meta text-caption-1-medium text-text-secondary">
                        <span>
                            {visibleOrders.length}{' '}
                            {isId ? 'pesanan ditampilkan' : 'orders shown'}
                        </span>
                    </div>
                    {mode === 'board' ? (
                        <OrdersBoard
                            columns={columns}
                            role={role}
                            canUpdate={!!onUpdateStatus && !isSaving}
                            onSelect={openOrder}
                            onMove={advanceOrder}
                        />
                    ) : (
                        <OrdersList
                            orders={visibleOrders}
                            role={role}
                            canUpdate={!!onUpdateStatus && !isSaving}
                            onSelect={openOrder}
                            onMove={advanceOrder}
                        />
                    )}
                </div>
            )}

            {selectedOrder && (
                <Drawer
                    placement="end"
                    size="md"
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setSelectedKey(null);
                    }}
                    overlayClassName="orders-boardui-drawer-overlay"
                    className="orders-boardui-drawer"
                    aria-label={isId ? 'Detail pesanan' : 'Order details'}
                >
                    <OrderDetail
                        selectedOrder={selectedOrder}
                        role={role}
                        canUpdate={!!onUpdateStatus && !isSaving}
                        onMove={advanceOrder}
                        onClose={() => setSelectedKey(null)}
                    />
                </Drawer>
            )}
        </section>
    );
}

function RiInformationLineIcon() {
    return <RiErrorWarningLine aria-hidden="true" />;
}

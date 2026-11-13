import { lazy, Suspense } from 'react';
import {
    RiAddLine,
    RiAlarmWarningLine,
    RiBankCardLine,
    RiCheckDoubleLine,
    RiFileList3Line,
    RiMoneyDollarCircleLine,
    RiQrCodeLine,
    RiRefreshLine,
    RiShoppingBag3Line,
    RiTimeLine,
} from '@remixicon/react';
import {
    StatCards,
    type Stat,
} from '../../../../../../components/application/dashboard/stat-cards';
import { Button } from '../../../../../../components/base/buttons/button';
import {
    Chip,
    type ChipColor,
} from '../../../../../../components/base/badges/chip';
import { cx } from '../../../../../../utils/cx';
import { formatRupiah } from '../../../lib/format';
import type {
    PosDashboard,
    PosOrderStatus,
    UserRole,
} from '../../../../lib/pos-types';
import { useLocale } from '../../i18n-context';
import type { AdminDish, AdminOrder } from '../../runtime-data';
import type { View } from '../../types';
import { DashboardFooter } from './DashboardFooter';
import { deriveDashboardOverview } from './dashboard-overview-model';
import { TopSellingMenu } from './components/TopSellingMenu';
import { OperationalActivity } from './components/OperationalActivity';
import { OrderWorkflowCard } from './OrderWorkflowCard';
import {
    orderQuantity,
    resolveOrderStatus,
    statusTranslations,
    tableLabel,
} from './order-status';
import { OwnerOrdersTable } from '../orders/OwnerOrdersTable';
import '../../styles/boardui-stats.css';

const OwnerHistoryPanels = lazy(() =>
    import('./OwnerHistoryPanels').then((module) => ({
        default: module.OwnerHistoryPanels,
    })),
);

type DashboardProps = {
    role: UserRole;
    dashboard?: PosDashboard;
    dishes?: AdminDish[];
    orders?: AdminOrder[];
    onChangeView: (view: View) => void;
    onOpenOrder: (order: AdminOrder) => void;
    liveInfo?: {
        statusCounts: Record<PosOrderStatus, number>;
        totalOrders: number;
        ordersToday: number;
        recentLimit: number;
        activeTableCount: number;
        activeTableOrders: AdminOrder[];
        priorityOrders: AdminOrder[];
        refreshing: boolean;
        onRefresh: () => void;
        historyRevision: number;
    };
};

function priorityTone(status: PosOrderStatus | null): ChipColor {
    if (status === 'ready') return 'lime';
    if (status === 'waiting_payment') return 'yellow';
    if (status === 'pending') return 'orange';
    return 'gray';
}

function priorityIcon(status: PosOrderStatus | null) {
    if (status === 'waiting_payment') return RiBankCardLine;
    if (status === 'ready') return RiCheckDoubleLine;
    return RiAlarmWarningLine;
}

export function DashboardView({
    role,
    dashboard,
    dishes = [],
    orders = [],
    onChangeView,
    onOpenOrder,
    liveInfo,
}: DashboardProps) {
    const { locale, t } = useLocale();
    const isId = locale === 'id';
    const localized = (id: string, en: string) => (isId ? id : en);

    // Keep the database-wide live counters instead of deriving them from the capped list.
    const {
        hasSnapshot,
        visibleOrders,
        statusCounts,
        statusCount,
        attentionAll,
        attention,
        topDishes,
        topSales,
        maxDishSales,
        allActiveTableOrders,
        tableOrders,
    } = deriveDashboardOverview(dashboard, dishes, orders, liveInfo);
    const metrics: Stat[] = [
        {
            icon: RiMoneyDollarCircleLine,
            label: t('dashboard.revenueToday'),
            value: dashboard ? formatRupiah(dashboard.revenueToday) : '—',
            delta: dashboard
                ? localized(
                      `${dashboard.paidToday} pembayaran`,
                      `${dashboard.paidToday} payments`,
                  )
                : '—',
            deltaColor: 'neutral',
            caption: localized(
                'Pembayaran sukses tercatat',
                'Recorded successful payments',
            ),
        },
        {
            icon: RiShoppingBag3Line,
            label: t('dashboard.activeOrders'),
            value: dashboard ? String(dashboard.activeOrders) : '—',
            delta: dashboard
                ? localized(
                      `${dashboard.waitingPayment} bayar`,
                      `${dashboard.waitingPayment} to pay`,
                  )
                : '—',
            deltaColor: 'neutral',
        },
        {
            icon: RiQrCodeLine,
            label: t('dashboard.qrOrders'),
            value: dashboard ? String(dashboard.qrOrders) : '—',
            delta:
                dashboard && (liveInfo?.ordersToday ?? visibleOrders.length)
                    ? Math.round(
                          (dashboard.qrOrders /
                              (liveInfo?.ordersToday ?? visibleOrders.length)) *
                              100,
                      ) + '%'
                    : '—',
            deltaColor: 'neutral',
        },
        {
            icon: RiAlarmWarningLine,
            label: t('dashboard.needAction'),
            value: dashboard ? String(dashboard.needAction) : '—',
            delta: dashboard
                ? localized(
                      `${statusCount('pending')} baru`,
                      `${statusCount('pending')} new`,
                  )
                : '—',
            deltaColor: 'neutral',
        },
    ];

    const today = new Intl.DateTimeFormat(isId ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
    }).format(new Date());

    return (
        <section
            className="app-view active owner-dashboard owner-dashboard-home"
            aria-label={t('dashboard.title')}
        >
            <header className="od-home-header">
                <div className="od-home-heading">
                    <h1 className="text-display-4-semibold text-text-primary">
                        {localized('Selamat datang kembali', 'Welcome back')}
                    </h1>
                    <p className="text-body-regular text-text-secondary">
                        {liveInfo
                            ? localized(
                                  'Prioritas aktif dan ringkasan transaksi tersimpan.',
                                  'Active priorities and recorded order activity.',
                              )
                            : localized(
                                  'Prioritas pesanan dan aktivitas restoran hari ini.',
                                  'Order priorities and restaurant activity today.',
                              )}
                    </p>
                </div>
                <div className="od-home-header-actions">
                    <span className="od-date text-caption-1-medium text-text-secondary">
                        <RiTimeLine aria-hidden="true" />
                        {today}
                    </span>
                    {liveInfo ? (
                        <Button
                            variant="secondary"
                            size="medium"
                            leadingIcon={RiRefreshLine}
                            onClick={liveInfo.onRefresh}
                            disabled={liveInfo.refreshing}
                        >
                            {localized('Perbarui', 'Refresh')}
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            size="medium"
                            leadingIcon={RiFileList3Line}
                            onClick={() => onChangeView('orders')}
                        >
                            {localized('Pesanan', 'Orders')}
                        </Button>
                    )}
                    <Button
                        variant="primary"
                        size="medium"
                        leadingIcon={RiAddLine}
                        onClick={() => onChangeView('menu')}
                    >
                        {t('dashboard.createOrder')}
                    </Button>
                </div>
            </header>

            <div className="od-overview-grid">
                <section
                    className="od-surface od-priority"
                    aria-labelledby="od-priority-title"
                >
                    <div className="od-card-topline">
                        <div>
                            <span className="od-section-label">
                                {localized(
                                    'Perlu ditangani',
                                    'Needs attention',
                                )}
                            </span>
                            <div className="od-card-heading-line">
                                <h2 id="od-priority-title">
                                    {hasSnapshot
                                        ? liveInfo
                                            ? (dashboard?.needAction ?? 0)
                                            : attentionAll.length
                                        : '—'}
                                </h2>
                                <span className="od-tiny-subtitle">
                                    {localized(
                                        'prioritas shift',
                                        'shift priorities',
                                    )}
                                </span>
                            </div>
                        </div>
                        <RiAlarmWarningLine
                            className="od-header-icon"
                            aria-hidden="true"
                        />
                    </div>
                    {attention.length ? (
                        <div className="od-priority-tiles">
                            {attention.map((order, index) => {
                                const status = resolveOrderStatus(order);
                                const Icon = priorityIcon(status);
                                return (
                                    <button
                                        type="button"
                                        key={
                                            order.id ??
                                            order.orderNumber ??
                                            index
                                        }
                                        className="od-priority-tile"
                                        onClick={() => onOpenOrder(order)}
                                        aria-label={localized(
                                            'Buka pesanan ' +
                                                (order.orderNumber ??
                                                    order.name),
                                            'Open order ' +
                                                (order.orderNumber ??
                                                    order.name),
                                        )}
                                    >
                                        <span
                                            className={cx(
                                                'od-priority-icon',
                                                'od-priority-icon--' +
                                                    (status ?? 'unknown'),
                                            )}
                                        >
                                            <Icon aria-hidden="true" />
                                        </span>
                                        <span className="od-priority-info">
                                            <strong>
                                                {order.orderNumber ??
                                                    (order.id != null
                                                        ? '#' + order.id
                                                        : order.name)}
                                            </strong>
                                            <small>
                                                {order.tableCode ||
                                                    tableLabel(order, isId)}
                                                {' · '}
                                                {orderQuantity(order)}{' '}
                                                {t('common.items')}
                                            </small>
                                        </span>
                                        <Chip
                                            color={priorityTone(status)}
                                            variant="caption"
                                            className="od-priority-status-chip"
                                        >
                                            {status
                                                ? statusTranslations[status][
                                                      locale
                                                  ]
                                                : order.status}
                                        </Chip>
                                        <span className="od-priority-time">
                                            {localized('Masuk ', 'Received ')}
                                            {order.time || '—'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="od-priority-empty">
                            <RiCheckDoubleLine aria-hidden="true" />
                            <strong>
                                {hasSnapshot
                                    ? localized('Semua terkendali', 'All clear')
                                    : localized(
                                          'Data belum tersedia',
                                          'Data unavailable',
                                      )}
                            </strong>
                            <span>
                                {hasSnapshot
                                    ? localized(
                                          'Belum ada pesanan yang membutuhkan tindakan.',
                                          'No orders currently require action.',
                                      )
                                    : localized(
                                          'Data pesanan belum tersedia untuk ditampilkan.',
                                          'Order data is not available yet.',
                                      )}
                            </span>
                        </div>
                    )}
                    <div className="od-priority-footer">
                        <Button
                            variant="secondary"
                            size="small"
                            leadingIcon={RiFileList3Line}
                            onClick={
                                liveInfo
                                    ? () => {
                                          if (attention[0])
                                              onOpenOrder(attention[0]);
                                      }
                                    : () => onChangeView('orders')
                            }
                            disabled={Boolean(liveInfo && !attention.length)}
                        >
                            {liveInfo
                                ? localized(
                                      'Detail prioritas',
                                      'Priority details',
                                  )
                                : localized('Lihat pesanan', 'View orders')}
                        </Button>
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => onChangeView('cashier')}
                        >
                            {localized('Kasir', 'Cashier')}
                        </Button>
                    </div>
                </section>

                <OrderWorkflowCard
                    hasSnapshot={hasSnapshot}
                    isLive={Boolean(liveInfo)}
                    statusCounts={statusCounts}
                />
            </div>

            <div className="od-analytics-grid">
                <TopSellingMenu
                    hasSnapshot={hasSnapshot}
                    topDishes={topDishes}
                    topSales={topSales}
                    maxDishSales={maxDishSales}
                    role={role}
                    onChangeView={onChangeView}
                    localized={localized}
                    t={t}
                />
                <OperationalActivity
                    hasSnapshot={hasSnapshot}
                    visibleOrders={visibleOrders}
                    liveInfo={liveInfo}
                    dashboard={dashboard}
                    activeTableOrderCount={allActiveTableOrders.length}
                    statusCount={statusCount}
                    localized={localized}
                    locale={locale}
                />
            </div>

            {role === 'owner' && (
                <Suspense
                    fallback={
                        <p className="od-empty-copy" role="status">
                            {localized(
                                'Menyiapkan analitik tersimpan…',
                                'Preparing recorded analytics…',
                            )}
                        </p>
                    }
                >
                    <OwnerHistoryPanels key={liveInfo?.historyRevision ?? 0} />
                </Suspense>
            )}

            <div
                className="od-kpi-section"
                aria-label={localized(
                    'Ringkasan kinerja',
                    'Performance summary',
                )}
            >
                <StatCards
                    variant="plain"
                    stats={metrics}
                    className="owner-dashboard-boardui-stats od-compact-stats"
                />
            </div>

            <OwnerOrdersTable
                orders={visibleOrders}
                onOpenOrder={onOpenOrder}
                onViewOrders={() => onChangeView('orders')}
                recentLimit={liveInfo?.recentLimit}
                totalOrders={liveInfo?.totalOrders}
                readOnly={Boolean(liveInfo)}
            />

            <DashboardFooter
                role={role}
                hasSnapshot={hasSnapshot}
                activeTableCount={
                    liveInfo?.activeTableCount ?? allActiveTableOrders.length
                }
                tableOrders={tableOrders}
                onChangeView={onChangeView}
            />
        </section>
    );
}

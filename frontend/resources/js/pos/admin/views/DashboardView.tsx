import { lazy, Suspense } from 'react';
import {
    RiAddLine,
    RiAlarmWarningLine,
    RiBankCardLine,
    RiCheckDoubleLine,
    RiFileList3Line,
    RiLayoutGridLine,
    RiMoneyDollarCircleLine,
    RiQrCodeLine,
    RiRefreshLine,
    RiRestaurantLine,
    RiShoppingBag3Line,
    RiTimeLine,
} from '@remixicon/react';
import {
    StatCards,
    type Stat,
} from '../../../../../components/application/dashboard/stat-cards';
import { Button } from '../../../../../components/base/buttons/button';
import {
    Chip,
    type ChipColor,
} from '../../../../../components/base/badges/chip';
import { cx } from '../../../../../utils/cx';
import { formatRupiah } from '../../lib/format';
import type {
    PosDashboard,
    PosOrderStatus,
    UserRole,
} from '../../../lib/pos-types';
import { useLocale } from '../i18n-context';
import type { AdminDish, AdminOrder } from '../runtime-data';
import type { View } from '../types';
import { DashboardFooter } from './dashboard/DashboardFooter';
import { OrderWorkflowCard } from './dashboard/OrderWorkflowCard';
import {
    orderQuantity,
    resolveOrderStatus,
    statusOrder,
    statusTranslations,
    tableLabel,
} from './dashboard/order-status';
import { OwnerOrdersTable } from './OwnerOrdersTable';
import './boardui-stats.css';

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

    // Live overview counts include the entire database, not the capped list.
    const hasSnapshot = dashboard !== undefined;
    const visibleOrders = hasSnapshot ? orders : [];
    const statusCounts = statusOrder.map((status) => ({
        status,
        count: liveInfo
            ? liveInfo.statusCounts[status]
            : visibleOrders.filter(
                  (order) => resolveOrderStatus(order) === status,
              ).length,
    }));
    const statusCount = (status: PosOrderStatus) =>
        statusCounts.find((item) => item.status === status)?.count ?? 0;
    const priority: Record<string, number> = {
        pending: 0,
        ready: 1,
        waiting_payment: 2,
    };
    const attentionAll = liveInfo
        ? liveInfo.priorityOrders
        : visibleOrders.filter(
              (order) =>
                  priority[resolveOrderStatus(order) ?? ''] !== undefined,
          );
    const attention = [...attentionAll]
        .sort(
            (a, b) =>
                (priority[resolveOrderStatus(a) ?? ''] ?? 9) -
                (priority[resolveOrderStatus(b) ?? ''] ?? 9),
        )
        .slice(0, 4);
    const topDishes = (hasSnapshot ? dishes : [])
        .filter((dish) => typeof dish.soldToday === 'number')
        .sort((a, b) => (b.soldToday ?? 0) - (a.soldToday ?? 0))
        .slice(0, 5);
    const topSales = topDishes.reduce(
        (sum, dish) => sum + (dish.soldToday ?? 0),
        0,
    );
    const maxDishSales = Math.max(
        1,
        ...topDishes.map((dish) => dish.soldToday ?? 0),
    );
    const allActiveTableOrders = liveInfo
        ? liveInfo.activeTableOrders
        : Array.from(
              new Map(
                  [...visibleOrders]
                      .reverse()
                      .filter(
                          (order) =>
                              order.tableCode &&
                              !['paid', 'cancelled'].includes(
                                  resolveOrderStatus(order) ?? '',
                              ),
                      )
                      .map((order) => [order.tableCode, order]),
              ).values(),
          );
    const tableOrders = allActiveTableOrders.slice(0, 5);
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
                    <h1>
                        {localized('Selamat datang kembali', 'Welcome back')}
                    </h1>
                    <p>
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
                    <span className="od-date">
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
                <section
                    className="od-surface od-menu-card"
                    aria-labelledby="od-menu-title"
                >
                    <div className="od-card-topline">
                        <div>
                            <span className="od-section-label">
                                {t('dashboard.popularMenu')}
                            </span>
                            <div className="od-card-heading-line">
                                <h2 id="od-menu-title">
                                    {hasSnapshot ? topSales : '—'}
                                </h2>
                                <span className="od-neutral-pill">
                                    {localized(
                                        'porsi terjual dari 5 menu',
                                        'servings across top 5 items',
                                    )}
                                </span>
                            </div>
                        </div>
                        <RiRestaurantLine
                            className="od-header-icon"
                            aria-hidden="true"
                        />
                    </div>
                    <div className="od-menu-plot">
                        {topDishes.length ? (
                            topDishes.map((dish, index) => {
                                const sold = dish.soldToday ?? 0;
                                const share = topSales
                                    ? Math.round((sold / topSales) * 100)
                                    : 0;
                                return (
                                    <div
                                        className="od-menu-plot-row"
                                        key={dish.id ?? dish.name}
                                    >
                                        <div className="od-menu-plot-caption">
                                            <span className="od-menu-index">
                                                {String(index + 1).padStart(
                                                    2,
                                                    '0',
                                                )}
                                            </span>
                                            <strong title={dish.name}>
                                                {dish.name}
                                            </strong>
                                            <span
                                                className="od-menu-share"
                                                title={localized(
                                                    'Bagian dari 5 menu terlaris',
                                                    'Share of top 5 items',
                                                )}
                                            >
                                                {share}%
                                            </span>
                                            <span className="od-menu-sold">
                                                {sold}{' '}
                                                {localized('porsi', 'sold')}
                                            </span>
                                        </div>
                                        <div
                                            className="od-menu-progress-track"
                                            role="meter"
                                            aria-label={`${dish.name}: ${sold} ${localized('porsi', 'sold')}`}
                                            aria-valuemin={0}
                                            aria-valuemax={maxDishSales}
                                            aria-valuenow={sold}
                                        >
                                            <span
                                                className="od-menu-progress-fill"
                                                style={{
                                                    width: `${(sold / maxDishSales) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="od-empty-copy">
                                {localized(
                                    'Data menu terjual belum tersedia.',
                                    'Sold-item data is not available yet.',
                                )}
                            </p>
                        )}
                    </div>
                    {topDishes.length > 0 && (
                        <div className="od-menu-footnote">
                            <span
                                className="od-chart-legend-dot"
                                aria-hidden="true"
                            />
                            {localized(
                                'Bar dibanding menu terlaris; persentase dari 5 menu.',
                                'Bars compare with the top item; percentages are shares of the top 5.',
                            )}
                        </div>
                    )}
                    {role === 'owner' && (
                        <Button
                            size="small"
                            variant="secondary"
                            className="od-card-footer-action"
                            onClick={() => onChangeView('owner-menu')}
                        >
                            {t('dashboard.manageMenu')}
                        </Button>
                    )}
                </section>

                <section
                    className="od-surface od-activity-card"
                    aria-labelledby="od-activity-title"
                >
                    <div className="od-card-topline">
                        <div>
                            <span className="od-section-label">
                                {localized(
                                    'Aktivitas operasional',
                                    'Operational activity',
                                )}
                            </span>
                            <div className="od-card-heading-line">
                                <h2 id="od-activity-title">
                                    {hasSnapshot
                                        ? (liveInfo?.totalOrders ??
                                          visibleOrders.length)
                                        : '—'}
                                </h2>
                                <span className="od-neutral-pill">
                                    {localized(
                                        'pesanan tercatat',
                                        'orders recorded',
                                    )}
                                </span>
                            </div>
                        </div>
                        <RiLayoutGridLine
                            className="od-header-icon"
                            aria-hidden="true"
                        />
                    </div>
                    <div className="od-activity-tiles">
                        {(
                            [
                                {
                                    icon: RiTimeLine,
                                    value: hasSnapshot
                                        ? statusCount('pending')
                                        : '—',
                                    label: localized('Menunggu', 'Pending'),
                                },
                                {
                                    icon: RiCheckDoubleLine,
                                    value: hasSnapshot
                                        ? statusCount('ready')
                                        : '—',
                                    label: localized('Siap disaji', 'Ready'),
                                },
                                {
                                    icon: RiBankCardLine,
                                    value: dashboard
                                        ? dashboard.waitingPayment
                                        : '—',
                                    label: localized('Belum dibayar', 'Unpaid'),
                                },
                                {
                                    icon: RiRestaurantLine,
                                    value: hasSnapshot
                                        ? (liveInfo?.activeTableCount ??
                                          allActiveTableOrders.length)
                                        : '—',
                                    label: localized(
                                        'Meja aktif',
                                        'Active tables',
                                    ),
                                },
                            ] as const
                        ).map(({ icon: Icon, value, label }) => (
                            <div className="od-activity-tile" key={label}>
                                <Icon aria-hidden="true" />
                                <strong>{value}</strong>
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="od-activity-overview">
                        <div className="od-activity-subheading">
                            <strong>
                                {localized(
                                    'Peta status pesanan',
                                    'Order status map',
                                )}
                            </strong>
                            <span>
                                {liveInfo
                                    ? localized(
                                          `${Math.min(48, visibleOrders.length)} pesanan terbaru`,
                                          `${Math.min(48, visibleOrders.length)} latest orders`,
                                      )
                                    : visibleOrders.length > 48
                                      ? localized(
                                            '48 pesanan terbaru',
                                            'Latest 48 orders',
                                        )
                                      : localized(
                                            '1 kotak = 1 pesanan',
                                            '1 cell = 1 order',
                                        )}
                            </span>
                        </div>
                        {visibleOrders.length ? (
                            <div
                                className="od-order-map"
                                role="img"
                                aria-label={localized(
                                    'Peta status pesanan terbaru yang ditampilkan, bukan seluruh riwayat. Warna menunjukkan status, bukan waktu.',
                                    'Status map of displayed recent orders, not the full history. Colors indicate status, not time.',
                                )}
                            >
                                {visibleOrders
                                    .slice(0, 48)
                                    .map((order, index) => {
                                        const status =
                                            resolveOrderStatus(order);
                                        return (
                                            <span
                                                key={
                                                    order.id ??
                                                    order.orderNumber ??
                                                    index
                                                }
                                                title={`${order.orderNumber ?? order.name}: ${status ? statusTranslations[status][locale] : order.status}`}
                                                className={cx(
                                                    'od-order-map-cell',
                                                    'od-order-map-cell--' +
                                                        (status ?? 'unknown'),
                                                )}
                                            />
                                        );
                                    })}
                            </div>
                        ) : (
                            <p className="od-activity-map-empty">
                                {localized(
                                    'Belum ada aktivitas pesanan.',
                                    'No order activity yet.',
                                )}
                            </p>
                        )}
                        {visibleOrders.length > 0 && (
                            <div
                                className="od-order-map-legend"
                                aria-label={localized(
                                    'Keterangan warna status',
                                    'Status color legend',
                                )}
                            >
                                <span>
                                    <i
                                        className="od-legend-swatch od-legend-swatch--progress"
                                        aria-hidden="true"
                                    />
                                    {localized('Diproses', 'In progress')}
                                </span>
                                <span>
                                    <i
                                        className="od-legend-swatch od-legend-swatch--ready"
                                        aria-hidden="true"
                                    />
                                    {localized('Siap / lunas', 'Ready / paid')}
                                </span>
                                <span>
                                    <i
                                        className="od-legend-swatch od-legend-swatch--payment"
                                        aria-hidden="true"
                                    />
                                    {localized('Bayar', 'Payment')}
                                </span>
                                <span>
                                    <i
                                        className="od-legend-swatch od-legend-swatch--cancelled"
                                        aria-hidden="true"
                                    />
                                    {localized('Batal', 'Cancelled')}
                                </span>
                            </div>
                        )}
                    </div>
                </section>
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

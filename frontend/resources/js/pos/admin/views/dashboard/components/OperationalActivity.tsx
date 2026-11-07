import {
    RiBankCardLine,
    RiCheckDoubleLine,
    RiLayoutGridLine,
    RiRestaurantLine,
    RiTimeLine,
} from '@remixicon/react';
import { cx } from '../../../../../../../utils/cx';
import type {
    PosDashboard,
    PosOrderStatus,
} from '../../../../../lib/pos-types';
import type { AdminOrder } from '../../../runtime-data';
import type { useLocale } from '../../../i18n-context';
import { resolveOrderStatus, statusTranslations } from '../order-status';

type OperationalActivityProps = {
    hasSnapshot: boolean;
    visibleOrders: AdminOrder[];
    liveInfo?: { totalOrders: number; activeTableCount: number };
    dashboard?: Pick<PosDashboard, 'waitingPayment'>;
    activeTableOrderCount: number;
    statusCount: (status: PosOrderStatus) => number;
    localized: (id: string, en: string) => string;
    locale: ReturnType<typeof useLocale>['locale'];
};

export function OperationalActivity({
    hasSnapshot,
    visibleOrders,
    liveInfo,
    dashboard,
    activeTableOrderCount,
    statusCount,
    localized,
    locale,
}: OperationalActivityProps) {
    return (
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
                            {localized('pesanan tercatat', 'orders recorded')}
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
                            value: hasSnapshot ? statusCount('pending') : '—',
                            label: localized('Menunggu', 'Pending'),
                        },
                        {
                            icon: RiCheckDoubleLine,
                            value: hasSnapshot ? statusCount('ready') : '—',
                            label: localized('Siap disaji', 'Ready'),
                        },
                        {
                            icon: RiBankCardLine,
                            value: dashboard ? dashboard.waitingPayment : '—',
                            label: localized('Belum dibayar', 'Unpaid'),
                        },
                        {
                            icon: RiRestaurantLine,
                            value: hasSnapshot
                                ? (liveInfo?.activeTableCount ??
                                  activeTableOrderCount)
                                : '—',
                            label: localized('Meja aktif', 'Active tables'),
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
                        {localized('Peta status pesanan', 'Order status map')}
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
                        {visibleOrders.slice(0, 48).map((order, index) => {
                            const status = resolveOrderStatus(order);
                            return (
                                <span
                                    key={order.id ?? order.orderNumber ?? index}
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
    );
}

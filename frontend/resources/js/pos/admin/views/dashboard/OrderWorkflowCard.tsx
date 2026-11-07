import { useState } from 'react';
import { Focusable } from 'react-aria-components';
import {
    SegmentedControl,
    SegmentedControlItem,
} from '../../../../../../components/base/segmented-control/segmented-control';
import {
    Tooltip,
    TooltipTrigger,
} from '../../../../../../components/base/tooltip/tooltip';
import { useLocale } from '../../i18n-context';
import {
    filterOrderStatusCounts,
    statusTranslations,
    type DashboardChartFilter,
    type OrderStatusCount,
} from './order-status';

type OrderWorkflowCardProps = {
    hasSnapshot: boolean;
    isLive: boolean;
    statusCounts: OrderStatusCount[];
};

export function OrderWorkflowCard({
    hasSnapshot,
    isLive,
    statusCounts,
}: OrderWorkflowCardProps) {
    const { locale } = useLocale();
    const isId = locale === 'id';
    const localized = (id: string, en: string) => (isId ? id : en);
    const orderUnit = (count: number) =>
        isId ? 'pesanan' : count === 1 ? 'order' : 'orders';
    const [chartFilter, setChartFilter] = useState<DashboardChartFilter>('all');
    const [selectedChartStatus, setSelectedChartStatus] = useState<
        OrderStatusCount['status'] | null
    >(null);
    const [tooltipChartStatus, setTooltipChartStatus] = useState<
        OrderStatusCount['status'] | null
    >(null);

    const chartStatuses = filterOrderStatusCounts(statusCounts, chartFilter);
    const chartMax = Math.max(1, ...chartStatuses.map((item) => item.count));
    const chartTotal = chartStatuses.reduce((sum, item) => sum + item.count, 0);
    const selectedChartEntry = chartStatuses.find(
        (item) => item.status === selectedChartStatus,
    );

    return (
        <section
            className="od-surface od-chart-card"
            aria-labelledby="od-chart-title"
        >
            <div className="od-card-topline od-chart-heading">
                <div>
                    <span className="od-section-label">
                        {localized('Alur pesanan', 'Order workflow')}
                    </span>
                    <div className="od-card-heading-line">
                        <h2 id="od-chart-title">
                            {hasSnapshot ? chartTotal : '—'}
                        </h2>
                        <span className="od-neutral-pill">
                            {isLive
                                ? localized('semua tersimpan', 'all recorded')
                                : localized('pesanan', 'orders')}
                        </span>
                    </div>
                </div>
                <SegmentedControl
                    className="od-chart-segments"
                    variant="solid"
                    aria-label={localized(
                        'Filter status pesanan',
                        'Filter order statuses',
                    )}
                    selectedKeys={new Set([chartFilter])}
                    onSelectionChange={(keys) => {
                        const next = [...keys][0];
                        if (next) {
                            setChartFilter(next as DashboardChartFilter);
                            setSelectedChartStatus(null);
                        }
                    }}
                >
                    <SegmentedControlItem id="all">
                        {localized('Semua', 'All')}
                    </SegmentedControlItem>
                    <SegmentedControlItem id="active">
                        {localized('Aktif', 'Active')}
                    </SegmentedControlItem>
                    <SegmentedControlItem id="finished">
                        {localized('Selesai', 'Closed')}
                    </SegmentedControlItem>
                </SegmentedControl>
            </div>
            {hasSnapshot ? (
                <div className="od-chart-figure">
                    <div className="od-chart-axis" aria-hidden="true">
                        <span>{chartMax}</span>
                        <span>
                            {chartMax > 1 ? Math.round(chartMax / 2) : ''}
                        </span>
                        <span>0</span>
                    </div>
                    <div
                        className="od-bar-plot"
                        role="group"
                        aria-label={localized(
                            'Jumlah pesanan berdasarkan status',
                            'Order counts by status',
                        )}
                    >
                        {chartStatuses.map(({ status, count }) => {
                            const fullLabel =
                                statusTranslations[status][locale];
                            const chartLabel = `${fullLabel}: ${count} ${orderUnit(count)}`;
                            const share = chartTotal
                                ? Math.round((count / chartTotal) * 100)
                                : 0;
                            return (
                                <div className="od-bar-group" key={status}>
                                    <span
                                        className="od-bar-count"
                                        aria-hidden="true"
                                    >
                                        {count}
                                    </span>
                                    <TooltipTrigger
                                        delay={150}
                                        isOpen={tooltipChartStatus === status}
                                    >
                                        <Focusable>
                                            <button
                                                type="button"
                                                className="od-bar-track"
                                                data-nonzero={count > 0}
                                                aria-label={
                                                    localized(
                                                        'Tinjau ',
                                                        'Inspect ',
                                                    ) + chartLabel
                                                }
                                                aria-pressed={
                                                    selectedChartStatus ===
                                                    status
                                                }
                                                onMouseEnter={() =>
                                                    setTooltipChartStatus(
                                                        status,
                                                    )
                                                }
                                                onMouseLeave={() =>
                                                    setTooltipChartStatus(
                                                        (current) =>
                                                            current === status
                                                                ? null
                                                                : current,
                                                    )
                                                }
                                                onFocus={() =>
                                                    setTooltipChartStatus(
                                                        status,
                                                    )
                                                }
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key === 'Escape'
                                                    ) {
                                                        setTooltipChartStatus(
                                                            null,
                                                        );
                                                    }
                                                }}
                                                onBlur={() =>
                                                    setTooltipChartStatus(
                                                        (current) =>
                                                            current === status
                                                                ? null
                                                                : current,
                                                    )
                                                }
                                                onClick={() =>
                                                    setSelectedChartStatus(
                                                        selectedChartStatus ===
                                                            status
                                                            ? null
                                                            : status,
                                                    )
                                                }
                                            >
                                                <span
                                                    className="od-bar-fill"
                                                    style={{
                                                        height: `${(count / chartMax) * 100}%`,
                                                    }}
                                                />
                                            </button>
                                        </Focusable>
                                        {tooltipChartStatus === status && (
                                            <Tooltip size="sm">
                                                {chartLabel} ({share}%)
                                            </Tooltip>
                                        )}
                                    </TooltipTrigger>
                                    <span
                                        className="od-bar-label"
                                        title={fullLabel}
                                    >
                                        {isId
                                            ? statusTranslations[status].shortId
                                            : statusTranslations[status]
                                                  .shortEn}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <p className="od-empty-copy">
                    {localized(
                        'Belum ada data status pesanan.',
                        'Order status data is not available yet.',
                    )}
                </p>
            )}
            <div className="od-chart-footnote">
                <span className="od-chart-legend-dot" aria-hidden="true" />
                <span aria-live="polite">
                    {selectedChartEntry
                        ? `${statusTranslations[selectedChartEntry.status][locale]}: ${selectedChartEntry.count} ${orderUnit(selectedChartEntry.count)} (${chartTotal ? Math.round((selectedChartEntry.count / chartTotal) * 100) : 0}%)`
                        : localized(
                              'Klik batang untuk melihat jumlah per status.',
                              'Select a bar to inspect its order count.',
                          )}
                </span>
            </div>
        </section>
    );
}

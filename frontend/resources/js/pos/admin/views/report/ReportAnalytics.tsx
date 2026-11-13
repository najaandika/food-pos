'use client';

import { RiMoneyDollarCircleLine, RiShoppingBag3Line } from '@remixicon/react';
import {
    RevenueChartCard,
    type RevenuePoint,
} from '../../../../../../components/application/dashboard/revenue-chart-card';
import {
    OrdersChartCard,
    type OrdersPoint,
} from '../../../../../../components/application/dashboard/orders-chart-card';
import {
    displayDate,
    formatRupiah,
    PAYMENT_METHOD_NAMES,
    reportChartBuckets,
    type Localize,
    type ReportPayload,
} from './report-model';

function Breakdown({
    rows,
    currency,
    emptyText,
}: {
    rows: Array<{ name: string; value: number; detail?: string }>;
    currency: boolean;
    emptyText: string;
}) {
    const max = Math.max(1, ...rows.map((row) => row.value));
    const sum = rows.reduce((total, row) => total + row.value, 0);
    if (!rows.length || sum === 0)
        return <p className="report-empty-small">{emptyText}</p>;
    return (
        <div className="report-breakdown">
            {rows.map((row) => (
                <div className="report-breakdown-row" key={row.name}>
                    <div className="report-breakdown-meta">
                        <span title={row.name}>{row.name}</span>
                        <strong>
                            {currency
                                ? formatRupiah(row.value)
                                : row.value.toLocaleString('id-ID')}
                            {row.detail ? ' · ' + row.detail : ''}
                        </strong>
                    </div>
                    <div
                        className="report-breakdown-track"
                        role="meter"
                        aria-label={
                            row.name +
                            ': ' +
                            Math.round((row.value / sum) * 100) +
                            '%'
                        }
                        aria-valuemin={0}
                        aria-valuemax={max}
                        aria-valuenow={row.value}
                    >
                        <span
                            className="report-breakdown-fill"
                            style={{
                                width: String((row.value / max) * 100) + '%',
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ReportAnalytics({
    report,
    locale,
    localize,
}: {
    report: ReportPayload;
    locale: string;
    localize: Localize;
}) {
    const buckets = reportChartBuckets(report.series, locale);
    const revenuePoints: RevenuePoint[] = buckets.map((item) => ({
        label: item.label,
        current: item.revenue,
    }));
    const ordersPoints: OrdersPoint[] = buckets.map((item) => ({
        label: item.label,
        current: item.orders,
    }));
    const period =
        displayDate(report.range.from, locale) +
        ' – ' +
        displayDate(report.range.to, locale);

    return (
        <>
            <div className="report-charts-grid">
                <section className="report-chart-slot">
                    {report.summary.successfulPayments > 0 ? (
                        <RevenueChartCard
                            data={revenuePoints}
                            title={localize('Tren pendapatan', 'Revenue trend')}
                            currency="IDR"
                            comparison="none"
                            summaryDetail={period}
                            className="report-revenue-chart"
                        />
                    ) : (
                        <div className="report-chart-empty" role="status">
                            <RiMoneyDollarCircleLine aria-hidden="true" />
                            <strong>
                                {localize(
                                    'Belum ada pembayaran sukses',
                                    'No successful payments yet',
                                )}
                            </strong>
                            <span>
                                {localize(
                                    'Grafik muncul saat pembayaran lunas tercatat.',
                                    'The chart appears after successful payments are recorded.',
                                )}
                            </span>
                        </div>
                    )}
                    <p className="report-chart-note">
                        {localize(
                            'Berdasarkan waktu pembayaran (paid_at).',
                            'Based on payment time (paid_at).',
                        )}
                    </p>
                </section>
                <section className="report-chart-slot">
                    {report.summary.ordersCreated > 0 ? (
                        <OrdersChartCard
                            data={ordersPoints}
                            title={localize('Pesanan masuk', 'Orders created')}
                            comparison="none"
                            summaryDetail={period}
                            className="report-orders-chart"
                        />
                    ) : (
                        <div className="report-chart-empty" role="status">
                            <RiShoppingBag3Line aria-hidden="true" />
                            <strong>
                                {localize('Belum ada pesanan', 'No orders yet')}
                            </strong>
                            <span>
                                {localize(
                                    'Grafik muncul saat pesanan tersimpan.',
                                    'The chart appears after orders are recorded.',
                                )}
                            </span>
                        </div>
                    )}
                    <p className="report-chart-note">
                        {localize(
                            'Berdasarkan pesanan dibuat (created_at), bukan saat bayar.',
                            'Based on order creation time, not payment time.',
                        )}
                    </p>
                </section>
            </div>
            <div className="report-breakdown-grid">
                <section className="report-panel">
                    <div className="report-panel-heading">
                        <span className="report-eyebrow">
                            {localize('ANALITIK PRODUK', 'PRODUCT ANALYTICS')}
                        </span>
                        <h2>
                            {localize('Kategori terlaris', 'Top categories')}
                        </h2>
                        <p>
                            {localize(
                                'Jumlah item dari pesanan lunas pada periode pembayaran.',
                                'Units from completed orders paid in the selected range.',
                            )}
                        </p>
                    </div>
                    <Breakdown
                        rows={report.categories.map((item) => ({
                            name: item.name,
                            value: item.quantity,
                        }))}
                        currency={false}
                        emptyText={localize(
                            'Belum ada data kategori.',
                            'No category data yet.',
                        )}
                    />
                </section>
                <section className="report-panel">
                    <div className="report-panel-heading">
                        <span className="report-eyebrow">
                            {localize('ALUR KEUANGAN', 'PAYMENT CHANNELS')}
                        </span>
                        <h2>
                            {localize('Metode pembayaran', 'Payment methods')}
                        </h2>
                        <p>
                            {localize(
                                'Nominal pembayaran sukses per metode.',
                                'Successful payment amount by method.',
                            )}
                        </p>
                    </div>
                    <Breakdown
                        rows={report.methods.map((item) => ({
                            name:
                                PAYMENT_METHOD_NAMES[item.method] ??
                                item.method,
                            value: item.amount,
                            detail:
                                String(item.count) +
                                ' ' +
                                localize('pembayaran', 'payments'),
                        }))}
                        currency
                        emptyText={localize(
                            'Belum ada pembayaran sukses.',
                            'No successful payments yet.',
                        )}
                    />
                </section>
            </div>
            <section className="report-panel report-service-panel">
                <div className="report-panel-heading">
                    <span className="report-eyebrow">
                        {localize('OPERASIONAL', 'OPERATIONS')}
                    </span>
                    <h2>
                        {localize(
                            'Asal & layanan pesanan',
                            'Order source & service',
                        )}
                    </h2>
                    <p>
                        {localize(
                            'Dihitung dari pesanan yang dibuat dalam rentang tanggal.',
                            'Based on orders created during the selected range.',
                        )}
                    </p>
                </div>
                <div className="report-channel-grid">
                    <div className="report-channel-group">
                        <h3>{localize('Asal pesanan', 'Order source')}</h3>
                        <Breakdown
                            currency={false}
                            rows={[
                                { name: 'QR', value: report.channels.qr },
                                {
                                    name: 'Manual',
                                    value: report.channels.manual,
                                },
                            ]}
                            emptyText={localize(
                                'Belum ada pesanan.',
                                'No orders.',
                            )}
                        />
                    </div>
                    <div className="report-channel-group">
                        <h3>{localize('Jenis layanan', 'Service type')}</h3>
                        <Breakdown
                            currency={false}
                            rows={[
                                {
                                    name: localize(
                                        'Makan di tempat',
                                        'Dine-in',
                                    ),
                                    value: report.serviceTypes.dine_in,
                                },
                                {
                                    name: localize('Bawa pulang', 'Takeaway'),
                                    value: report.serviceTypes.takeaway,
                                },
                            ]}
                            emptyText={localize(
                                'Belum ada layanan.',
                                'No service activity.',
                            )}
                        />
                    </div>
                </div>
            </section>
        </>
    );
}

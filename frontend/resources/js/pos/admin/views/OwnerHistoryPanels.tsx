'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    RiBarChart2Line,
    RiCalendar2Line,
    RiDatabase2Line,
    RiRefreshLine,
    RiTimeLine,
} from '@remixicon/react';
import {
    RevenueChartCard,
    type RevenuePoint,
} from '../../../../../components/application/dashboard/revenue-chart-card';
import { Button } from '../../../../../components/base/buttons/button';
import { cx } from '../../../../../utils/cx';
import { httpRequest } from '../../shared/api/http-client';
import { useLocale } from '../i18n-context';
import './OwnerHistoryPanels.css';

export type OwnerHistory = {
    source: 'database';
    timezone: 'Asia/Jakarta';
    from: string;
    to: string;
    days: number;
    totals: {
        revenue: number;
        payments: number;
        orders: number;
    };
    dailyRevenue: Array<{
        date: string;
        amount: number;
        payments: number;
    }>;
    orderActivity: Array<{
        weekday: number;
        hour: number;
        count: number;
    }>;
    maxActivity: number;
};

type HeatCell = OwnerHistory['orderActivity'][number];

const WEEKDAYS = {
    id: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
} as const;

function heatLevel(count: number, maximum: number): number {
    if (maximum <= 0 || count <= 0) return 0;
    const share = count / maximum;
    if (share >= 0.75) return 4;
    if (share >= 0.5) return 3;
    if (share >= 0.25) return 2;
    return 1;
}

function formatPeriod(date: string, locale: 'id' | 'en'): string {
    return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    }).format(new Date(date + 'T12:00:00Z'));
}

function isOwnerHistory(value: unknown): value is OwnerHistory {
    if (!value || typeof value !== 'object') return false;
    const result = value as Partial<OwnerHistory>;
    return (
        result.source === 'database' &&
        result.timezone === 'Asia/Jakarta' &&
        !!result.totals &&
        Number.isFinite(result.totals.revenue) &&
        Number.isFinite(result.totals.payments) &&
        Number.isFinite(result.totals.orders) &&
        Array.isArray(result.dailyRevenue) &&
        result.dailyRevenue.length === 30 &&
        Array.isArray(result.orderActivity) &&
        result.orderActivity.length === 84
    );
}

export async function requestOwnerHistory(
    signal?: AbortSignal,
): Promise<OwnerHistory> {
    const result = await httpRequest<unknown>('/dashboard/history', { signal });
    if (!isOwnerHistory(result)) {
        throw new Error('Invalid history response');
    }
    return result;
}

export function OwnerHistoryPanels() {
    const { locale } = useLocale();
    const isId = locale === 'id';
    const localized = (id: string, en: string) => (isId ? id : en);
    const [history, setHistory] = useState<OwnerHistory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [revision, setRevision] = useState(0);
    const [selectedCell, setSelectedCell] = useState<HeatCell | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(false);

        requestOwnerHistory(controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return;
                setHistory(result);
                setSelectedCell(null);
            })
            .catch(() => {
                if (!controller.signal.aborted) setError(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [revision]);

    const revenuePoints = useMemo<RevenuePoint[]>(
        () =>
            history?.dailyRevenue.map((item) => ({
                label: formatPeriod(item.date, locale),
                current: item.amount,
            })) ?? [],
        [history, locale],
    );

    const heatCells = useMemo(() => {
        const index = new Map<string, HeatCell>();
        for (const cell of history?.orderActivity ?? []) {
            index.set(cell.weekday + ':' + cell.hour, cell);
        }
        return index;
    }, [history]);

    const period = history
        ? formatPeriod(history.from, locale) +
          ' – ' +
          formatPeriod(history.to, locale)
        : localized('30 hari terakhir', 'Last 30 days');

    const timeLabel = (hour: number) =>
        String(hour).padStart(2, '0') +
        '.00–' +
        String(hour + 2).padStart(2, '0') +
        '.00';

    const cellLabel = (cell: HeatCell) =>
        WEEKDAYS[locale][cell.weekday - 1] +
        ', ' +
        timeLabel(cell.hour) +
        ': ' +
        cell.count +
        ' ' +
        localized('pesanan', cell.count === 1 ? 'order' : 'orders');

    return (
        <section
            className="od-history-section"
            aria-label={localized(
                'Analitik historis dari database',
                'Historical database analytics',
            )}
        >
            <header className="od-history-heading">
                <div>
                    <span className="od-section-label">
                        {localized('ANALITIK TERSIMPAN', 'RECORDED ANALYTICS')}
                    </span>
                    <h2>
                        {localized(
                            'Tren pendapatan & jam ramai',
                            'Revenue & busy hours',
                        )}
                    </h2>
                    <p>
                        <RiDatabase2Line aria-hidden="true" />
                        {localized(
                            'Data dari Laravel · zona waktu Jakarta · ',
                            'Laravel database · Jakarta time · ',
                        )}
                        {period}
                    </p>
                </div>
                <Button
                    size="small"
                    variant="secondary"
                    leadingIcon={RiRefreshLine}
                    onClick={() => setRevision((value) => value + 1)}
                    disabled={loading}
                >
                    {localized('Perbarui', 'Refresh')}
                </Button>
            </header>

            {error && !history ? (
                <div className="od-history-error" role="alert">
                    <RiDatabase2Line aria-hidden="true" />
                    <div>
                        <strong>
                            {localized(
                                'Histori database belum dapat dimuat.',
                                'Database history could not be loaded.',
                            )}
                        </strong>
                        <span>
                            {localized(
                                'Periksa koneksi Laravel atau coba Perbarui. Angka simulasi tidak digunakan.',
                                'Check the Laravel connection or refresh. No simulated values are used.',
                            )}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="od-history-grid" aria-busy={loading}>
                    <div className="od-history-revenue">
                        {loading && !history ? (
                            <div
                                className="od-history-placeholder"
                                role="status"
                            >
                                <RiBarChart2Line aria-hidden="true" />
                                {localized(
                                    'Memuat pendapatan tersimpan…',
                                    'Loading recorded revenue…',
                                )}
                            </div>
                        ) : history && history.totals.payments > 0 ? (
                            <RevenueChartCard
                                data={revenuePoints}
                                comparison="none"
                                currency="IDR"
                                className="od-history-revenue-card"
                                title={localized(
                                    'Pendapatan 30 hari',
                                    'Revenue over 30 days',
                                )}
                                summaryDetail={localized(
                                    history.totals.payments +
                                        ' pembayaran berhasil · 30 hari',
                                    history.totals.payments +
                                        ' successful payments · 30 days',
                                )}
                            />
                        ) : (
                            <div
                                className="od-history-placeholder"
                                role="status"
                            >
                                <RiBarChart2Line aria-hidden="true" />
                                <strong>
                                    {localized(
                                        'Belum ada pembayaran terverifikasi.',
                                        'No verified payments yet.',
                                    )}
                                </strong>
                                <span>
                                    {localized(
                                        'Grafik akan tampil setelah pembayaran tersimpan dengan status lunas dan tanggal bayar.',
                                        'The chart appears when paid transactions with payment timestamps are saved.',
                                    )}
                                </span>
                            </div>
                        )}
                        {history && history.totals.payments > 0 && (
                            <p className="od-history-note">
                                <RiCalendar2Line aria-hidden="true" />
                                {localized(
                                    'Berdasarkan payments.paid_at; pembayaran pending/refunded tidak dihitung.',
                                    'Based on payments.paid_at; pending/refunded payments are excluded.',
                                )}
                            </p>
                        )}
                    </div>

                    <section
                        className="od-history-heatmap"
                        aria-labelledby="od-heatmap-title"
                    >
                        <header className="od-history-card-head">
                            <span className="od-section-label">
                                {localized(
                                    'PESANAN PER WAKTU',
                                    'ORDERS BY TIME',
                                )}
                            </span>
                            <h3 id="od-heatmap-title">
                                {localized('Jam tersibuk', 'Busiest hours')}
                            </h3>
                            <p>
                                {history
                                    ? localized(
                                          history.totals.orders +
                                              ' pesanan · 30 hari',
                                          history.totals.orders +
                                              ' orders · 30 days',
                                      )
                                    : period}
                            </p>
                        </header>

                        {loading && !history ? (
                            <div
                                className="od-history-placeholder"
                                role="status"
                            >
                                <RiTimeLine aria-hidden="true" />
                                {localized(
                                    'Memuat waktu pesanan…',
                                    'Loading order activity…',
                                )}
                            </div>
                        ) : history && history.totals.orders > 0 ? (
                            <>
                                <div
                                    className="od-time-matrix"
                                    role="group"
                                    aria-label={localized(
                                        'Aktivitas pesanan berdasarkan hari dan interval 2 jam',
                                        'Order activity by weekday and two-hour intervals',
                                    )}
                                >
                                    <span
                                        className="od-time-corner"
                                        aria-hidden="true"
                                    />
                                    {WEEKDAYS[locale].map((day, i) => (
                                        <span key={i} className="od-time-day">
                                            {day}
                                        </span>
                                    ))}
                                    {Array.from({ length: 12 }, (_, row) => {
                                        const hour = row * 2;
                                        return (
                                            <div
                                                className="od-time-row"
                                                key={hour}
                                            >
                                                <span className="od-time-hour">
                                                    {String(hour).padStart(
                                                        2,
                                                        '0',
                                                    )}
                                                </span>
                                                {Array.from(
                                                    { length: 7 },
                                                    (_, index) => {
                                                        const weekday =
                                                            index + 1;
                                                        const cell =
                                                            heatCells.get(
                                                                weekday +
                                                                    ':' +
                                                                    hour,
                                                            ) ?? {
                                                                weekday,
                                                                hour,
                                                                count: 0,
                                                            };
                                                        return (
                                                            <button
                                                                key={weekday}
                                                                type="button"
                                                                className={cx(
                                                                    'od-time-cell',
                                                                    selectedCell?.weekday ===
                                                                        weekday &&
                                                                        selectedCell.hour ===
                                                                            hour &&
                                                                        'od-time-cell--selected',
                                                                )}
                                                                data-level={heatLevel(
                                                                    cell.count,
                                                                    history.maxActivity,
                                                                )}
                                                                aria-label={cellLabel(
                                                                    cell,
                                                                )}
                                                                aria-pressed={
                                                                    selectedCell?.weekday ===
                                                                        weekday &&
                                                                    selectedCell.hour ===
                                                                        hour
                                                                }
                                                                title={cellLabel(
                                                                    cell,
                                                                )}
                                                                onClick={() =>
                                                                    setSelectedCell(
                                                                        cell,
                                                                    )
                                                                }
                                                            />
                                                        );
                                                    },
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="od-time-legend">
                                    <span>{localized('Sepi', 'Less')}</span>
                                    {[0, 1, 2, 3, 4].map((level) => (
                                        <i
                                            key={level}
                                            data-level={level}
                                            aria-hidden="true"
                                        />
                                    ))}
                                    <span>{localized('Ramai', 'More')}</span>
                                </div>
                                <p className="od-time-insight" role="status">
                                    {selectedCell
                                        ? cellLabel(selectedCell)
                                        : localized(
                                              'Pilih satu kotak untuk melihat jumlah pesanan.',
                                              'Select a cell to inspect its order count.',
                                          )}
                                </p>
                            </>
                        ) : (
                            <div
                                className="od-history-placeholder"
                                role="status"
                            >
                                <RiTimeLine aria-hidden="true" />
                                <strong>
                                    {localized(
                                        'Belum ada aktivitas tersimpan.',
                                        'No recorded activity yet.',
                                    )}
                                </strong>
                                <span>
                                    {localized(
                                        'Heatmap akan aktif setelah pesanan tercatat di database.',
                                        'The heatmap appears when orders are recorded in the database.',
                                    )}
                                </span>
                            </div>
                        )}
                        <p className="od-history-note">
                            <RiTimeLine aria-hidden="true" />
                            {localized(
                                'Waktu dibuatnya pesanan; agregasi Sen–Min per 2 jam selama 30 hari.',
                                'Order creation time; Monday–Sunday, two-hour slots across 30 days.',
                            )}
                        </p>
                    </section>
                </div>
            )}

            {error && history && (
                <p className="od-history-inline-error" role="alert">
                    {localized(
                        'Gagal memperbarui. Data tersimpan terakhir masih ditampilkan.',
                        'Refresh failed. Previously loaded data remains visible.',
                    )}
                </p>
            )}
        </section>
    );
}

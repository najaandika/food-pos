'use client';

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
    RiCalendarLine,
    RiDownload2Line,
    RiFileChartLine,
    RiMoneyDollarCircleLine,
    RiPrinterLine,
    RiRefreshLine,
    RiShoppingBag3Line,
    RiStore2Line,
    RiWallet3Line,
} from '@remixicon/react';
import {
    StatCards,
    type Stat,
} from '../../../../../components/application/dashboard/stat-cards';
import {
    DateRangePicker,
    type DateRangeValue,
} from '../../../../../components/base/date-picker/date-range-picker';
import { Button } from '../../../../../components/base/buttons/button';
import { httpRequest } from '../../shared/api/http-client';
import { useLocale } from '../i18n-context';
import { loadSharedQuery, peekSharedQuery } from './shared-query-cache';
import { ReportTransactions } from './ReportTransactions';
import {
    displayDate,
    formatRupiah,
    initialReportRange,
    isReportPayload,
    reportParams,
    reportRangeDays,
    type ReportPayload,
    type PaymentMethodFilter,
    type PaymentStatusFilter,
    type ReportSort,
} from './report/report-model';
import './boardui-stats.css';

const ReportAnalytics = lazy(() =>
    import('./ReportAnalytics').then((module) => ({
        default: module.ReportAnalytics,
    })),
);

function initialReportKey(): string {
    const params = reportParams(
        initialReportRange(),
        'all',
        'all',
        '',
        'recent',
    );
    params.set('page', '1');
    return 'report:' + params.toString();
}

type ReportError =
    | ''
    | 'unavailable'
    | 'invalid_range'
    | 'invalid_filter'
    | 'invalid_response';

function hasReportRangeError(body: unknown): boolean {
    if (!body || typeof body !== 'object') return false;
    const errors = (body as { errors?: unknown }).errors;
    if (!errors || typeof errors !== 'object') return false;
    const fields = errors as Record<string, unknown>;
    return Boolean(fields.from || fields.to);
}

export async function requestOwnerReport(
    queryString: string,
): Promise<ReportPayload> {
    const json = await httpRequest<unknown>(
        '/dashboard/report?' + queryString,
        {
            resolveError: (status, body) =>
                status === 422
                    ? hasReportRangeError(body)
                        ? 'invalid_range'
                        : 'invalid_filter'
                    : undefined,
        },
    );
    if (!isReportPayload(json)) throw new Error('invalid_response');
    return json;
}

export function ReportView() {
    const { locale } = useLocale();
    const isId = locale === 'id';
    const localize = (id: string, en: string) => (isId ? id : en);
    const [range, setRange] = useState<DateRangeValue>(initialReportRange);
    const [method, setMethod] = useState<PaymentMethodFilter>('all');
    const [status, setStatus] = useState<PaymentStatusFilter>('all');
    const [sort, setSort] = useState<ReportSort>('recent');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);
    const [response, setResponse] = useState<ReportPayload | null>(
        () => peekSharedQuery<ReportPayload>(initialReportKey()) ?? null,
    );
    const [loading, setLoading] = useState(
        () => peekSharedQuery<ReportPayload>(initialReportKey()) === undefined,
    );
    const [errorCode, setErrorCode] = useState<ReportError>('');
    const [rangeError, setRangeError] = useState('');

    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    // New successful cash payments should appear without leaving Reports.
    // The existing AbortController prevents stale responses from overwriting
    // a newer date/filter request when this quiet refresh happens.
    useEffect(() => {
        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                setRevision((current) => current + 1);
            }
        }, 60000);
        return () => window.clearInterval(interval);
    }, []);

    const queryString = useMemo(() => {
        const params = reportParams(range, method, status, search, sort);
        params.set('page', String(page));
        return params.toString();
    }, [range, method, status, search, sort, page]);

    useEffect(() => {
        let active = true;
        const key = 'report:' + queryString;
        const cached = peekSharedQuery<ReportPayload>(key);
        setResponse(cached ?? null);
        setLoading(!cached);
        setErrorCode('');
        void loadSharedQuery(
            key,
            async () => {
                return requestOwnerReport(queryString);
            },
            { staleTimeMs: 45000, force: revision > 0 },
        )
            .then((json) => {
                if (!active) return;
                setResponse(json);
            })
            .catch((reason: unknown) => {
                if (active) {
                    const code = reason instanceof Error ? reason.message : '';
                    setErrorCode(
                        code === 'invalid_range' ||
                            code === 'invalid_filter' ||
                            code === 'invalid_response'
                            ? code
                            : 'unavailable',
                    );
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [queryString, revision]);

    const selectedRange = (next: DateRangeValue | null) => {
        if (!next) return;
        const days = reportRangeDays(next);
        if (days < 1 || days > 366) {
            setRangeError(
                localize(
                    'Pilih periode 1–366 hari.',
                    'Select a 1–366 day period.',
                ),
            );
            return;
        }
        setRangeError('');
        setRange(next);
        setPage(1);
    };

    const report =
        response &&
        response.range.from === range.start.toString() &&
        response.range.to === range.end.toString() &&
        response.filters.method === method &&
        response.filters.status === status &&
        response.filters.search === search &&
        response.filters.sort === sort &&
        response.transactions.page === page
            ? response
            : null;

    const stats: Stat[] = report
        ? [
              {
                  icon: RiMoneyDollarCircleLine,
                  label: localize('Pendapatan', 'Revenue'),
                  value: formatRupiah(report.summary.revenue),
                  deltaColor: 'neutral',
                  hint: localize(
                      'Total pembayaran sukses menurut paid_at (WIB).',
                      'Successful payments by paid_at (Jakarta time).',
                  ),
              },
              {
                  icon: RiWallet3Line,
                  label: localize('Pesanan dibayar', 'Paid orders'),
                  value: report.summary.paidOrders.toLocaleString('id-ID'),
                  deltaColor: 'neutral',
                  hint: localize(
                      'Pesanan unik dengan pembayaran sukses; split payment tidak menggandakan jumlah.',
                      'Unique orders with successful payments; split payments are not duplicated.',
                  ),
              },
              {
                  icon: RiShoppingBag3Line,
                  label: localize('Pesanan masuk', 'Orders created'),
                  value: report.summary.ordersCreated.toLocaleString('id-ID'),
                  deltaColor: 'neutral',
                  hint: localize(
                      'Jumlah pesanan berdasarkan tanggal dibuat, bukan waktu dibayar.',
                      'Orders counted by creation date, not payment date.',
                  ),
              },
              {
                  icon: RiStore2Line,
                  label: localize('Menu terjual', 'Items sold'),
                  value: report.summary.itemsSold.toLocaleString('id-ID'),
                  deltaColor: 'neutral',
                  hint: localize(
                      'Item dari pesanan berstatus lunas yang dibayar selama periode.',
                      'Items from completed orders paid during the selected period.',
                  ),
              },
          ]
        : [];

    const exportQuery = reportParams(
        range,
        method,
        status,
        search,
        sort,
    ).toString();
    const handleExport = () =>
        window.location.assign('/dashboard/report/export?' + exportQuery);
    const handlePrint = () =>
        window.open(
            '/dashboard/report/print?' + exportQuery,
            '_blank',
            'noopener,noreferrer',
        );

    const errorText =
        errorCode === 'invalid_range'
            ? localize(
                  'Periode tidak valid. Pilih maksimal 366 hari.',
                  'Invalid period. Select at most 366 days.',
              )
            : errorCode === 'invalid_filter'
              ? localize(
                    'Filter laporan tidak valid. Periksa filter yang dipilih dan coba lagi.',
                    'Invalid report filter. Review your selected filters and try again.',
                )
              : errorCode === 'invalid_response'
                ? localize(
                      'Format respons laporan tidak sesuai.',
                      'Invalid report response format.',
                  )
                : localize(
                      'Gagal memuat laporan database. Coba Perbarui.',
                      'Could not load database report. Try refreshing.',
                  );

    return (
        <section
            className="app-view active report-boardui"
            aria-label={localize(
                'Halaman laporan penjualan',
                'Sales report page',
            )}
        >
            <header className="report-page-header">
                <div className="report-page-title">
                    <span className="report-eyebrow">
                        {localize('LAPORAN & ANALITIK', 'REPORTS & ANALYTICS')}
                    </span>
                    <h1>{localize('Laporan Penjualan', 'Sales Report')}</h1>
                    <p>
                        {localize(
                            'Penjualan, transaksi, dan performa menu berdasarkan database Laravel.',
                            'Sales, transactions and menu performance from the Laravel database.',
                        )}
                    </p>
                </div>
                <div className="report-page-actions">
                    <DateRangePicker
                        value={range}
                        onChange={selectedRange}
                        aria-label={localize(
                            'Pilih rentang tanggal',
                            'Select date range',
                        )}
                        className="report-date-trigger"
                        popoverClassName="report-date-popover"
                    />
                    <Button
                        variant="secondary"
                        size="small"
                        leadingIcon={RiRefreshLine}
                        disabled={loading}
                        onClick={() => setRevision((value) => value + 1)}
                    >
                        {localize('Perbarui', 'Refresh')}
                    </Button>
                    <Button
                        variant="secondary"
                        size="small"
                        leadingIcon={RiPrinterLine}
                        disabled={!report}
                        onClick={handlePrint}
                    >
                        {localize('Cetak / PDF', 'Print / PDF')}
                    </Button>
                    <Button
                        variant="primary"
                        size="small"
                        leadingIcon={RiDownload2Line}
                        disabled={!report}
                        onClick={handleExport}
                    >
                        {localize('Ekspor CSV', 'Export CSV')}
                    </Button>
                </div>
            </header>
            {rangeError && (
                <p className="report-alert" role="alert">
                    {rangeError}
                </p>
            )}
            {errorCode && (
                <p className="report-alert" role="alert">
                    {errorText}
                </p>
            )}
            {!report && (
                <div className="report-loading" role="status">
                    <RiFileChartLine aria-hidden="true" />
                    <span>
                        {loading
                            ? localize(
                                  'Memuat laporan tersimpan…',
                                  'Loading recorded report…',
                              )
                            : localize(
                                  'Tidak ada laporan yang dapat ditampilkan.',
                                  'No report is currently available.',
                              )}
                    </span>
                    {!loading && (
                        <Button
                            variant="secondary"
                            size="small"
                            leadingIcon={RiRefreshLine}
                            onClick={() => setRevision((value) => value + 1)}
                        >
                            {localize('Coba lagi', 'Try again')}
                        </Button>
                    )}
                </div>
            )}
            {report && (
                <div className="report-content" aria-busy={loading}>
                    <div className="report-data-caption">
                        <span>
                            <RiCalendarLine aria-hidden="true" />
                            {displayDate(report.range.from, locale)} –{' '}
                            {displayDate(report.range.to, locale)}
                        </span>
                        <span>{localize('Waktu Jakarta', 'Jakarta time')}</span>
                        <span>
                            {localize(
                                'Database tersimpan',
                                'Recorded database',
                            )}
                        </span>
                        {loading && (
                            <span>
                                {localize('Memperbarui…', 'Refreshing…')}
                            </span>
                        )}
                    </div>
                    <StatCards
                        stats={stats}
                        variant="plain"
                        columns={4}
                        className="report-stat-cards"
                    />
                    <Suspense
                        fallback={
                            <div
                                className="report-loading report-loading-charts"
                                role="status"
                            >
                                {localize(
                                    'Menyiapkan grafik laporan…',
                                    'Preparing report charts…',
                                )}
                            </div>
                        }
                    >
                        <ReportAnalytics
                            report={report}
                            locale={locale}
                            localize={localize}
                        />
                    </Suspense>
                    <ReportTransactions
                        report={report}
                        loading={loading}
                        status={status}
                        method={method}
                        sort={sort}
                        searchInput={searchInput}
                        onStatus={(next) => {
                            setStatus(next);
                            setPage(1);
                        }}
                        onMethod={(next) => {
                            setMethod(next);
                            setPage(1);
                        }}
                        onSort={(next) => {
                            setSort(next);
                            setPage(1);
                        }}
                        onSearch={setSearchInput}
                        onPage={setPage}
                        localize={localize}
                        locale={locale}
                    />
                    <p className="report-disclaimer">
                        {localize(
                            'Pendapatan dari pembayaran sukses (paid_at). Tanggal memfilter seluruh analitik; metode memfilter metrik pembayaran, menu terjual, dan tabel, bukan pesanan masuk/asal layanan. Status dan pencarian hanya memfilter tabel. Cetak/PDF melalui browser (maksimal 500 baris), CSV mencakup seluruh hasil filter.',
                            'Revenue uses successful payments (paid_at). Dates filter all analytics; method filters payment metrics, sold items and the table, not orders created or service types. Status and search filter the table only. Print/PDF uses the browser (max 500 rows); CSV includes all filtered rows.',
                        )}
                    </p>
                </div>
            )}
        </section>
    );
}

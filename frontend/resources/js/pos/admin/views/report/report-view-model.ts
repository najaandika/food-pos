import {
    RiMoneyDollarCircleLine,
    RiWallet3Line,
    RiShoppingBag3Line,
    RiStore2Line,
} from '@remixicon/react';
import type { Stat } from '../../../../../../components/application/dashboard/stat-cards';
import type {
    ReportRange,
    ReportPayload,
    ReportSort,
    PaymentMethodFilter,
    PaymentStatusFilter,
    Localize,
} from './report-model';
import { formatRupiah } from './report-model';

export type ReportError =
    | ''
    | 'unavailable'
    | 'invalid_range'
    | 'invalid_filter'
    | 'invalid_response';

type Selection = {
    response: ReportPayload | null;
    range: ReportRange;
    method: PaymentMethodFilter;
    status: PaymentStatusFilter;
    search: string;
    sort: ReportSort;
    page: number;
};

export function matchingReport({
    response,
    range,
    method,
    status,
    search,
    sort,
    page,
}: Selection): ReportPayload | null {
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

    return report;
}

export function createReportStats(
    report: ReportPayload | null,
    localize: Localize,
): Stat[] {
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

    return stats;
}

export function reportErrorMessage(
    errorCode: ReportError,
    localize: Localize,
): string {
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

    return errorText;
}

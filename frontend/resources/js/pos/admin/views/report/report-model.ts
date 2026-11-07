import { parseDate, type CalendarDate } from '@internationalized/date';

export type ReportTransaction = {
    id: number;
    orderNumber: string;
    customerName: string;
    tableCode: string | null;
    source: string;
    method: string;
    status: string;
    amount: number;
    at: string;
    dateBasis: 'paid_at' | 'created_at';
};

export type ReportPayload = {
    source: 'database';
    timezone: 'Asia/Jakarta';
    generatedAt: string;
    range: { from: string; to: string; days: number };
    filters: { method: string; status: string; search: string; sort: string };
    summary: {
        revenue: number;
        successfulPayments: number;
        paidOrders: number;
        ordersCreated: number;
        itemsSold: number;
        averagePaidOrder: number;
    };
    series: Array<{
        date: string;
        revenue: number;
        orders: number;
        payments: number;
    }>;
    methods: Array<{ method: string; amount: number; count: number }>;
    categories: Array<{ name: string; quantity: number }>;
    channels: { qr: number; manual: number };
    serviceTypes: { dine_in: number; takeaway: number };
    transactions: {
        items: ReportTransaction[];
        page: number;
        perPage: number;
        total: number;
        lastPage: number;
    };
};

export type ReportSort = 'recent' | 'amount_desc' | 'amount_asc';
export type PaymentMethodFilter = 'all' | 'cash' | 'qris' | 'transfer';
export type PaymentStatusFilter =
    | 'all'
    | 'paid'
    | 'pending'
    | 'refunded'
    | 'failed';
export type ReportRange = { start: CalendarDate; end: CalendarDate };
export type Localize = (id: string, en: string) => string;

export function jakartaToday(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const get = (key: string) =>
        parts.find((part) => part.type === key)?.value ?? '';
    return get('year') + '-' + get('month') + '-' + get('day');
}

export function initialReportRange(): ReportRange {
    const end = parseDate(jakartaToday());
    return { start: end.subtract({ days: 29 }), end };
}

export function isReportPayload(data: unknown): data is ReportPayload {
    if (!data || typeof data !== 'object') return false;
    const value = data as Partial<ReportPayload>;
    return (
        value.source === 'database' &&
        value.timezone === 'Asia/Jakarta' &&
        !!value.summary &&
        Number.isFinite(value.summary.revenue) &&
        Number.isFinite(value.summary.paidOrders) &&
        Number.isFinite(value.summary.ordersCreated) &&
        Number.isFinite(value.summary.itemsSold) &&
        !!value.range &&
        !!value.transactions &&
        Number.isFinite(value.transactions.total) &&
        Array.isArray(value.transactions.items) &&
        Array.isArray(value.series) &&
        Array.isArray(value.methods) &&
        Array.isArray(value.categories)
    );
}

export function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
}

export function formatJakartaDateTime(value: string, locale: string): string {
    return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function displayDate(
    value: string,
    locale: string,
    monthOnly = false,
): string {
    return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
        timeZone: 'UTC',
        month: 'short',
        ...(monthOnly
            ? { year: '2-digit' as const }
            : { day: 'numeric' as const }),
    }).format(new Date(value + 'T12:00:00Z'));
}

export function reportChartBuckets(
    series: ReportPayload['series'],
    locale: string,
): Array<{ label: string; revenue: number; orders: number }> {
    if (series.length <= 31) {
        return series.map((day) => ({
            label: displayDate(day.date, locale),
            revenue: day.revenue,
            orders: day.orders,
        }));
    }
    const buckets = new Map<
        string,
        { label: string; revenue: number; orders: number }
    >();
    for (const [index, day] of series.entries()) {
        const key =
            series.length <= 120
                ? 'week-' + Math.floor(index / 7)
                : day.date.slice(0, 7);
        if (!buckets.has(key)) {
            buckets.set(key, {
                label: displayDate(day.date, locale, series.length > 120),
                revenue: 0,
                orders: 0,
            });
        }
        const bucket = buckets.get(key)!;
        bucket.revenue += day.revenue;
        bucket.orders += day.orders;
    }
    return [...buckets.values()];
}

export const PAYMENT_METHOD_NAMES: Record<string, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
};

export function reportRangeDays(value: ReportRange): number {
    const start = Date.UTC(
        value.start.year,
        value.start.month - 1,
        value.start.day,
    );
    const end = Date.UTC(value.end.year, value.end.month - 1, value.end.day);
    return Math.round((end - start) / 86_400_000) + 1;
}

export function reportParams(
    range: ReportRange,
    method: PaymentMethodFilter,
    status: PaymentStatusFilter,
    search: string,
    sort: ReportSort,
): URLSearchParams {
    const params = new URLSearchParams({
        from: range.start.toString(),
        to: range.end.toString(),
        method,
        status,
        sort,
    });
    if (search.trim()) params.set('search', search.trim());
    return params;
}

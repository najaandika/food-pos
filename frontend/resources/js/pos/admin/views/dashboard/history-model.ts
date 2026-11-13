import type { RevenuePoint } from '../../../../../../components/application/dashboard/revenue-chart-card';

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
export type HeatCell = OwnerHistory['orderActivity'][number];
export const WEEKDAYS = {
    id: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
} as const;
export function heatLevel(count: number, maximum: number): number {
    if (maximum <= 0 || count <= 0) return 0;
    const share = count / maximum;
    if (share >= 0.75) return 4;
    if (share >= 0.5) return 3;
    if (share >= 0.25) return 2;
    return 1;
}
export function formatPeriod(date: string, locale: 'id' | 'en'): string {
    return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    }).format(new Date(date + 'T12:00:00Z'));
}
export function isOwnerHistory(value: unknown): value is OwnerHistory {
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

export function mapHistoryRevenue(
    history: OwnerHistory | null,
    locale: 'id' | 'en',
): RevenuePoint[] {
    return (
        history?.dailyRevenue.map((item) => ({
            label: formatPeriod(item.date, locale),
            current: item.amount,
        })) ?? []
    );
}

export function indexHistoryActivity(
    history: OwnerHistory | null,
): Map<string, HeatCell> {
    const index = new Map<string, HeatCell>();
    for (const cell of history?.orderActivity ?? []) {
        index.set(cell.weekday + ':' + cell.hour, cell);
    }
    return index;
}

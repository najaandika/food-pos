import type { PosOrderStatus } from '../../../../lib/pos-types';
import type { AdminOrder } from '../../runtime-data';

export type DashboardChartFilter = 'all' | 'active' | 'finished';

export type OrderStatusCount = {
    status: PosOrderStatus;
    count: number;
};

export const statusOrder: PosOrderStatus[] = [
    'pending',
    'accepted',
    'preparing',
    'ready',
    'served',
    'waiting_payment',
    'paid',
    'cancelled',
];

export const statusTranslations: Record<
    PosOrderStatus,
    { id: string; en: string; shortId: string; shortEn: string }
> = {
    pending: {
        id: 'Menunggu',
        en: 'Pending',
        shortId: 'Baru',
        shortEn: 'New',
    },
    accepted: {
        id: 'Diterima',
        en: 'Accepted',
        shortId: 'Trm',
        shortEn: 'Acc',
    },
    preparing: {
        id: 'Diproses',
        en: 'Preparing',
        shortId: 'Prs',
        shortEn: 'Prep',
    },
    ready: {
        id: 'Siap disajikan',
        en: 'Ready to serve',
        shortId: 'Siap',
        shortEn: 'Rdy',
    },
    served: {
        id: 'Disajikan',
        en: 'Served',
        shortId: 'Saji',
        shortEn: 'Srv',
    },
    waiting_payment: {
        id: 'Menunggu bayar',
        en: 'Waiting payment',
        shortId: 'Byr',
        shortEn: 'Pay',
    },
    paid: {
        id: 'Lunas',
        en: 'Paid',
        shortId: 'Lunas',
        shortEn: 'Paid',
    },
    cancelled: {
        id: 'Dibatalkan',
        en: 'Cancelled',
        shortId: 'Batal',
        shortEn: 'Cncl',
    },
};

export function resolveOrderStatus(order: AdminOrder): PosOrderStatus | null {
    if (order.rawStatus) return order.rawStatus;
    const normalized = order.status.trim().toLowerCase().replaceAll(' ', '_');
    const legacyLabels: Record<string, PosOrderStatus> = {
        new: 'pending',
        in_progress: 'preparing',
        completed: 'paid',
    };
    return statusOrder.includes(normalized as PosOrderStatus)
        ? (normalized as PosOrderStatus)
        : (legacyLabels[normalized] ?? null);
}

export function filterOrderStatusCounts(
    counts: OrderStatusCount[],
    filter: DashboardChartFilter,
): OrderStatusCount[] {
    return counts.filter(({ status }) =>
        filter === 'active'
            ? !['paid', 'cancelled'].includes(status)
            : filter === 'finished'
              ? ['paid', 'cancelled'].includes(status)
              : true,
    );
}

export function orderQuantity(order: AdminOrder): number {
    return order.items.reduce((total, item) => {
        const quantity = Number(item[1]);
        return total + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);
}

export function tableLabel(order: AdminOrder, isId: boolean): string {
    if (order.type === 'takeaway') return isId ? 'Bawa pulang' : 'Takeaway';
    return order.tableCode || order.table;
}

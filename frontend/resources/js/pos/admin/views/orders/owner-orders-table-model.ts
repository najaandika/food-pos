import type { AdminOrder } from '../../runtime-data';
import type { ChipColor } from '../../../../../../components/base/badges/chip';
import { orderNumber } from './order-ui';

export type StatusFilter =
    | 'all'
    | 'attention'
    | 'waiting_payment'
    | 'paid'
    | 'cancelled';
export type SourceFilter = 'all' | 'qr' | 'manual';
export const PER_PAGE = 8;

export function statusColor(order: AdminOrder): ChipColor {
    switch (order.rawStatus) {
        case 'pending':
            return 'orange';
        case 'accepted':
            return 'blue';
        case 'preparing':
            return 'purple';
        case 'ready':
            return 'lime';
        case 'served':
            return 'cyan';
        case 'waiting_payment':
            return 'yellow';
        case 'paid':
            return 'lime';
        case 'cancelled':
            return 'rose';
        default:
            return 'gray';
    }
}

export function orderSortValue(order: AdminOrder): number {
    if (order.id !== undefined) return order.id;
    const numeric = Number((order.orderNumber ?? '').replace(/\D/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
}

export function filterOwnerOrders(
    orders: AdminOrder[],
    statusFilter: StatusFilter,
    sourceFilter: SourceFilter,
    query: string,
    locale: string,
): AdminOrder[] {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return orders.filter((order) => {
        const status = order.rawStatus;
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'attention'
                ? status === 'pending' ||
                  status === 'ready' ||
                  status === 'waiting_payment'
                : status === statusFilter);
        const matchesSource =
            sourceFilter === 'all' || order.source === sourceFilter;
        const matchesQuery =
            !normalized ||
            [
                orderNumber(order),
                String(order.id ?? ''),
                order.name,
                order.table,
                order.tableCode ?? '',
                order.status,
                ...order.items.map(([name]) => name),
            ].some((value) =>
                value.toLocaleLowerCase(locale).includes(normalized),
            );
        return matchesStatus && matchesSource && matchesQuery;
    });
}

export function getOwnerOrdersPage(filteredCount: number, pageIndex: number) {
    const pages = Math.max(1, Math.ceil(filteredCount / PER_PAGE));
    const safePageIndex = Math.min(pageIndex, pages - 1);
    const shownStart = filteredCount === 0 ? 0 : safePageIndex * PER_PAGE + 1;
    const shownEnd = Math.min(filteredCount, (safePageIndex + 1) * PER_PAGE);
    return { pages, safePageIndex, shownStart, shownEnd };
}

import type { AdminOrder } from '../../runtime-data';
import { countItems, orderNumber, ORDER_STATUSES } from './order-ui';

export type SortColumn =
    | 'order'
    | 'customer'
    | 'source'
    | 'time'
    | 'items'
    | 'total'
    | 'status';

export const columnIds = [
    'order',
    'customer',
    'source',
    'time',
    'items',
    'total',
    'status',
    'actions',
] as const;

export function minutesFromTime(text: string): number | string {
    const match = text.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return text;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return text;
    const period = match[3]?.toUpperCase();
    const normalizedHours = period
        ? (hours % 12) + (period === 'PM' ? 12 : 0)
        : hours;
    return normalizedHours * 60 + minutes;
}

export function sortValue(
    order: AdminOrder,
    column: SortColumn,
): string | number {
    switch (column) {
        case 'order':
            return order.id ?? orderNumber(order);
        case 'customer':
            return order.name;
        case 'source':
            return order.source ?? '';
        case 'time':
            return minutesFromTime(order.time);
        case 'items':
            return countItems(order);
        case 'total':
            return order.rawTotal ?? Number(order.total.replace(/[^\d]/g, ''));
        case 'status':
            return order.rawStatus
                ? ORDER_STATUSES.indexOf(order.rawStatus)
                : Number.MAX_SAFE_INTEGER;
    }
}

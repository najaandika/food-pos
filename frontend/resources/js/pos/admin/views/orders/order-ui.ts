import type { PosOrderStatus, UserRole } from '@/lib/pos-types';
import type { AdminOrder } from '../../runtime-data';

export const ORDER_STATUSES: PosOrderStatus[] = [
    'pending',
    'accepted',
    'preparing',
    'ready',
    'served',
    'waiting_payment',
    'paid',
    'cancelled',
];

export const ACTIVE_ORDER_STATUSES: PosOrderStatus[] = ORDER_STATUSES.filter(
    (status) => status !== 'paid' && status !== 'cancelled',
);

const ROLE_TRANSITIONS: Record<
    UserRole,
    Partial<Record<PosOrderStatus, PosOrderStatus>>
> = {
    owner: {
        pending: 'accepted',
        accepted: 'preparing',
        preparing: 'ready',
        ready: 'served',
        served: 'waiting_payment',
    },
    kasir: { served: 'waiting_payment' },
    waiters: {
        pending: 'accepted',
        accepted: 'preparing',
        preparing: 'ready',
        ready: 'served',
        served: 'waiting_payment',
    },
};

export function nextOrderStatus(
    role: UserRole,
    status?: PosOrderStatus,
): PosOrderStatus | null {
    return status ? (ROLE_TRANSITIONS[role][status] ?? null) : null;
}

export function orderActionLabel(
    status: PosOrderStatus,
    t: (key: string) => string,
): string {
    const key: Partial<Record<PosOrderStatus, string>> = {
        pending: 'orders.accept',
        accepted: 'orders.kitchen',
        preparing: 'orders.ready',
        ready: 'orders.serve',
        served: 'orders.sendBill',
    };
    return t(key[status] ?? 'orders.update');
}

export function orderStatusLabel(
    status: PosOrderStatus,
    t: (key: string) => string,
): string {
    const result = t('status.' + status);
    return result === 'status.' + status
        ? status
              .replaceAll('_', ' ')
              .replace(/\b\w/g, (char) => char.toUpperCase())
        : result;
}

export function orderSourceLabel(
    source: AdminOrder['source'],
    t: (key: string) => string,
): string {
    if (source === 'qr') return t('orders.qrTableOrdering');
    if (source === 'manual') return t('orders.manualOrder');
    return '—';
}

export function orderIdentity(order: AdminOrder): string {
    return String(
        order.id ??
            order.orderNumber ??
            order.table + ':' + order.name + ':' + order.time,
    );
}

export function orderNumber(order: AdminOrder): string {
    return order.orderNumber ?? (order.id != null ? '#' + order.id : '—');
}

export function countItems(order: AdminOrder): number {
    return order.items.reduce((count, item) => {
        const quantity = Number(item[1]);
        return count + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);
}

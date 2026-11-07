import type { ChipColor } from '../../../../../../components/base/badges/chip';
import type { PosOrderStatus, PosTableStatus } from '../../../../lib/pos-types';
import type { AdminOrder, AdminTable } from '../../runtime-data';

export type QueueFilter = 'all' | 'ready' | 'inProgress' | 'billing';
export type DetailTarget = { kind: 'table' | 'order'; key: string } | null;
export type AttentionItem = {
    key: string;
    kind: 'call' | 'ready' | 'bill';
    code: string;
    title: string;
    time: string;
    table?: AdminTable;
    order?: AdminOrder;
};
export type TableStatusStyle = {
    label: string;
    color: ChipColor;
    dot: 'green' | 'yellow' | 'indigo';
};

type Translate = (key: string) => string;

export const nextWaiterAction: Partial<
    Record<
        PosOrderStatus,
        {
            label: 'accept' | 'kitchen' | 'ready' | 'serve' | 'sendBill';
            status: PosOrderStatus;
        }
    >
> = {
    pending: { label: 'accept', status: 'accepted' },
    accepted: { label: 'kitchen', status: 'preparing' },
    preparing: { label: 'ready', status: 'ready' },
    ready: { label: 'serve', status: 'served' },
    served: { label: 'sendBill', status: 'waiting_payment' },
};

export const orderKey = (order: AdminOrder): string =>
    String(
        order.id ??
            order.orderNumber ??
            order.table + '-' + order.name + '-' + order.time,
    );

export const tableKey = (table: AdminTable): string =>
    String(table.id ?? table.code);

export function activeOrderFor(
    table: AdminTable,
    orders: AdminOrder[],
): AdminOrder | undefined {
    if (table.rawStatus === 'available' || table.rawStatus === 'inactive')
        return undefined;
    const active = orders.filter(
        (order) =>
            order.rawStatus && !['paid', 'cancelled'].includes(order.rawStatus),
    );
    return (
        active.find(
            (order) =>
                table.currentOrderId != null &&
                order.id === table.currentOrderId,
        ) ??
        active.find((order) => (order.tableCode ?? order.table) === table.code)
    );
}

export function getServiceOrders(orders: AdminOrder[]): AdminOrder[] {
    return orders.filter(
        (order) =>
            order.rawStatus &&
            [
                'pending',
                'accepted',
                'preparing',
                'ready',
                'served',
                'waiting_payment',
            ].includes(order.rawStatus),
    );
}

export function filterQueueOrders(
    orders: AdminOrder[],
    filter: QueueFilter,
): AdminOrder[] {
    return orders.filter((order) => {
        if (filter === 'ready') return order.rawStatus === 'ready';
        if (filter === 'inProgress')
            return ['pending', 'accepted', 'preparing'].includes(
                order.rawStatus ?? '',
            );
        if (filter === 'billing')
            return ['served', 'waiting_payment'].includes(
                order.rawStatus ?? '',
            );
        return true;
    });
}

export function orderColor(status?: PosOrderStatus): ChipColor {
    if (status === 'ready') return 'lime';
    if (status === 'waiting_payment') return 'yellow';
    if (status === 'pending') return 'blue';
    if (status === 'served') return 'cyan';
    return 'neutral';
}

export function tableStatusStyles(
    t: Translate,
): Record<PosTableStatus, TableStatusStyle> {
    return {
        available: {
            label: t('common.available'),
            color: 'lime',
            dot: 'green',
        },
        occupied: {
            label: t('dashboard.occupied'),
            color: 'neutral',
            dot: 'indigo',
        },
        preparing: {
            label: t('dashboard.preparing'),
            color: 'yellow',
            dot: 'yellow',
        },
        ready: {
            label: t('dashboard.ready'),
            color: 'blue',
            dot: 'indigo',
        },
        waiting_payment: {
            label: t('dashboard.waitingPayment'),
            color: 'yellow',
            dot: 'yellow',
        },
        need_waiter: {
            label: t('waiters.customerCalls'),
            color: 'rose',
            dot: 'indigo',
        },
        inactive: {
            label: t('common.inactive'),
            color: 'soft',
            dot: 'indigo',
        },
    };
}

export function waiterActionLabels(t: Translate) {
    return {
        accept: t('orders.accept'),
        kitchen: t('orders.kitchen'),
        ready: t('orders.ready'),
        serve: t('orders.serve'),
        sendBill: t('orders.sendBill'),
    };
}

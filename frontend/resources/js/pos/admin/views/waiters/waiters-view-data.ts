import type { AdminOrder, AdminTable } from '../../runtime-data';
import {
    activeOrderFor,
    orderKey,
    tableKey,
    type AttentionItem,
    type DetailTarget,
} from './waiter-model';

export function deriveWaiterBoard(
    serviceOrders: AdminOrder[],
    tables: AdminTable[],
    isId: boolean,
    t: (key: string) => string,
) {
    const readyOrders = serviceOrders.filter(
        (order) => order.rawStatus === 'ready',
    );
    const customerCalls = tables.filter(
        (table) => table.rawStatus === 'need_waiter',
    );
    const occupiedTables = tables.filter(
        (table) =>
            table.rawStatus !== 'available' && table.rawStatus !== 'inactive',
    );
    const attentions: AttentionItem[] = [
        ...customerCalls.map((table) => ({
            key: 'call-' + tableKey(table),
            kind: 'call' as const,
            code: table.code,
            title: isId
                ? 'Pelanggan membutuhkan bantuan'
                : 'Customer needs assistance',
            time: t('common.now'),
            table,
        })),
        ...readyOrders.map((order) => ({
            key: 'ready-' + orderKey(order),
            kind: 'ready' as const,
            code: order.table,
            title: order.name + ' · ' + t('waiters.readyToServeOrder'),
            time: order.time,
            order,
        })),
        ...serviceOrders
            .filter((order) => order.rawStatus === 'waiting_payment')
            .map((order) => ({
                key: 'bill-' + orderKey(order),
                kind: 'bill' as const,
                code: order.table,
                title: order.name + ' · ' + t('waiters.requestedBill'),
                time: order.time,
                order,
            })),
    ];

    return { readyOrders, customerCalls, occupiedTables, attentions };
}

export function resolveWaiterFocus(
    detail: DetailTarget,
    tables: AdminTable[],
    orders: AdminOrder[],
) {
    const focusTable =
        detail?.kind === 'table'
            ? tables.find((table) => tableKey(table) === detail.key)
            : undefined;
    const focusOrder =
        detail?.kind === 'order'
            ? orders.find((order) => orderKey(order) === detail.key)
            : focusTable
              ? activeOrderFor(focusTable, orders)
              : undefined;

    return { focusTable, focusOrder };
}

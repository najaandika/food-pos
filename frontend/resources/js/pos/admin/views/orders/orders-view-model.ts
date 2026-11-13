import {
    RiCheckboxCircleLine,
    RiErrorWarningLine,
    RiFileList3Line,
    RiTimeLine,
} from '@remixicon/react';
import type { PosOrderStatus } from '@/lib/pos-types';
import type { AdminOrder } from '../../runtime-data';
import type { Stat } from '../../../../../../components/application/dashboard/stat-cards';
import type { OrderColumn } from './OrdersBoard';
import {
    ACTIVE_ORDER_STATUSES,
    ORDER_STATUSES,
    orderStatusLabel,
} from './order-ui';

export type StageFilter = 'active' | 'all' | PosOrderStatus;
export type SourceFilter = 'all' | 'qr' | 'manual' | 'dine_in' | 'takeaway';

export function filterWorkspaceOrders(
    orders: AdminOrder[],
    stageFilter: StageFilter,
    sourceFilter: SourceFilter,
    query: string,
    locale: string,
): AdminOrder[] {
    const text = query.trim().toLocaleLowerCase(locale === 'id' ? 'id' : 'en');
    return orders.filter((order) => {
        const statusMatches =
            stageFilter === 'all' ||
            (stageFilter === 'active'
                ? Boolean(
                      order.rawStatus &&
                      ACTIVE_ORDER_STATUSES.includes(order.rawStatus),
                  )
                : order.rawStatus === stageFilter);
        const sourceMatches =
            sourceFilter === 'all' ||
            (sourceFilter === 'qr' && order.source === 'qr') ||
            (sourceFilter === 'manual' && order.source === 'manual') ||
            (sourceFilter === 'dine_in' && order.type === 'dine_in') ||
            (sourceFilter === 'takeaway' && order.type === 'takeaway');
        const queryMatches =
            !text ||
            [
                order.orderNumber,
                String(order.id ?? ''),
                order.name,
                order.table,
                order.meta,
                order.notes ?? '',
                ...order.items.map(([name]) => name),
            ].some((value) =>
                (value ?? '')
                    .toLocaleLowerCase(locale === 'id' ? 'id' : 'en')
                    .includes(text),
            );
        return statusMatches && sourceMatches && queryMatches;
    });
}

export function createOrdersViewModel(
    orders: AdminOrder[],
    visibleOrders: AdminOrder[],
    stageFilter: StageFilter,
    isId: boolean,
    t: (key: string) => string,
): {
    countStatus: (status: PosOrderStatus) => number;
    activeCount: number;
    paidCount: number;
    cancelledCount: number;
    kpiStats: Stat[];
    stageTabs: Array<{ key: StageFilter; label: string; count: number }>;
    extraStatuses: PosOrderStatus[];
    sourceTabs: Array<{ key: SourceFilter; label: string }>;
    columns: OrderColumn[];
} {
    const countStatus = (status: PosOrderStatus) =>
        orders.filter((order) => order.rawStatus === status).length;
    const activeCount = orders.filter(
        (order) =>
            order.rawStatus && ACTIVE_ORDER_STATUSES.includes(order.rawStatus),
    ).length;
    const paidCount = countStatus('paid');
    const cancelledCount = countStatus('cancelled');
    const kpiStats: Stat[] = [
        {
            label: isId ? 'Pesanan aktif' : 'Active orders',
            value: String(activeCount),
            icon: RiFileList3Line,
            deltaColor: 'neutral',
        },
        {
            label: isId ? 'Pesanan baru' : 'New orders',
            value: String(countStatus('pending')),
            icon: RiTimeLine,
            deltaColor: 'neutral',
        },
        {
            label: isId ? 'Siap saji' : 'Ready to serve',
            value: String(countStatus('ready')),
            icon: RiCheckboxCircleLine,
            deltaColor: 'neutral',
        },
        {
            label: isId ? 'Belum dibayar' : 'Awaiting payment',
            value: String(countStatus('waiting_payment')),
            icon: RiErrorWarningLine,
            deltaColor: 'neutral',
        },
    ];

    const stageTabs: Array<{ key: StageFilter; label: string; count: number }> =
        [
            {
                key: 'active',
                label: isId ? 'Aktif' : 'Active',
                count: activeCount,
            },
            { key: 'all', label: isId ? 'Semua' : 'All', count: orders.length },
            {
                key: 'pending',
                label: orderStatusLabel('pending', t),
                count: countStatus('pending'),
            },
            {
                key: 'ready',
                label: orderStatusLabel('ready', t),
                count: countStatus('ready'),
            },
        ];
    const extraStatuses: PosOrderStatus[] = ORDER_STATUSES.filter(
        (status) => status !== 'pending' && status !== 'ready',
    );
    const sourceTabs: Array<{ key: SourceFilter; label: string }> = [
        { key: 'all', label: isId ? 'Semua sumber' : 'All sources' },
        { key: 'qr', label: 'QR' },
        { key: 'manual', label: t('orders.manualOrder') },
        { key: 'dine_in', label: t('orders.dineIn') },
        { key: 'takeaway', label: t('orders.takeaway') },
    ];
    const operationalGroups: Omit<OrderColumn, 'items'>[] = [
        {
            key: 'queue',
            label: isId ? 'Baru' : 'New',
            hint: isId ? 'Perlu diterima' : 'Awaiting acceptance',
            statuses: ['pending'],
        },
        {
            key: 'kitchen',
            label: isId ? 'Dapur' : 'Kitchen',
            hint: isId ? 'Diterima & dimasak' : 'Accepted & preparing',
            statuses: ['accepted', 'preparing'],
        },
        {
            key: 'ready',
            label: isId ? 'Siap' : 'Ready',
            hint: isId ? 'Menunggu disajikan' : 'Ready to serve',
            statuses: ['ready'],
        },
        {
            key: 'payment',
            label: isId ? 'Pembayaran' : 'Payment',
            hint: isId ? 'Disajikan & ditagih' : 'Served & awaiting payment',
            statuses: ['served', 'waiting_payment'],
        },
        {
            key: 'history',
            label: isId ? 'Riwayat' : 'History',
            hint: isId ? 'Lunas & dibatalkan' : 'Paid & cancelled',
            statuses: ['paid', 'cancelled'],
        },
    ];
    const columns: OrderColumn[] = operationalGroups
        .filter((group) =>
            stageFilter === 'active'
                ? group.key !== 'history'
                : stageFilter === 'all' || group.statuses.includes(stageFilter),
        )
        .map((group) => ({
            ...group,
            items: visibleOrders.filter(
                (order) =>
                    order.rawStatus != null &&
                    group.statuses.includes(order.rawStatus),
            ),
        }));

    return {
        countStatus,
        activeCount,
        paidCount,
        cancelledCount,
        kpiStats,
        stageTabs,
        extraStatuses,
        sourceTabs,
        columns,
    };
}

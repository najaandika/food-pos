import type { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { RiEyeLine } from '@remixicon/react';
import type { UserRole } from '@/lib/pos-types';
import { Button } from '../../../../../../components/base/buttons/button';
import type { AdminOrder } from '../../runtime-data';
import { StatusChip } from './StatusChip';
import {
    countItems,
    nextOrderStatus,
    orderActionLabel,
    orderNumber,
    orderSourceLabel,
} from './order-ui';
import { sortValue, type SortColumn } from './orders-list-model';

type Props = {
    role: UserRole;
    isId: boolean;
    canUpdate: boolean;
    onSelect: (order: AdminOrder) => void;
    onMove: (order: AdminOrder) => void;
    t: (key: string) => string;
};

export function createOrderColumns({
    role,
    isId,
    canUpdate,
    onSelect,
    onMove,
    t,
}: Props): ColumnDef<AdminOrder>[] {
    const collator = new Intl.Collator(isId ? 'id-ID' : 'en-US', {
        numeric: true,
        sensitivity: 'base',
    });

    const sortColumn = (
        column: SortColumn,
        label: string,
        cell: (order: AdminOrder) => ReactNode,
    ): ColumnDef<AdminOrder> => ({
        id: column,
        header: label,
        accessorFn: (order) => sortValue(order, column),
        sortingFn: (rowA, rowB) => {
            const left = sortValue(rowA.original, column);
            const right = sortValue(rowB.original, column);
            return typeof left === 'number' && typeof right === 'number'
                ? left - right
                : collator.compare(String(left), String(right));
        },
        cell: ({ row }) => cell(row.original),
    });

    return [
        sortColumn('order', isId ? 'Pesanan' : 'Order', (order) => (
            <div className="orders-data-id">
                <strong>{orderNumber(order)}</strong>
                <small>
                    {order.type === 'takeaway'
                        ? t('orders.takeaway')
                        : t('orders.dineIn')}
                </small>
            </div>
        )),
        sortColumn(
            'customer',
            isId ? 'Meja & pelanggan' : 'Table & customer',
            (order) => (
                <div className="orders-data-person">
                    <strong>{order.name}</strong>
                    <span>{order.table}</span>
                </div>
            ),
        ),
        sortColumn('source', isId ? 'Sumber' : 'Source', (order) => (
            <span
                className="orders-source-label"
                data-source={order.source ?? 'unknown'}
            >
                {orderSourceLabel(order.source, t)}
            </span>
        )),
        sortColumn('time', isId ? 'Waktu' : 'Time', (order) => (
            <span className="text-caption-1-regular text-text-secondary">
                {order.time}
            </span>
        )),
        sortColumn('items', isId ? 'Item' : 'Items', (order) => (
            <span className="text-body-medium">{countItems(order)}</span>
        )),
        sortColumn('total', 'Total', (order) => (
            <strong className="orders-data-price text-body-2-bold text-text-primary">
                {order.total}
            </strong>
        )),
        sortColumn('status', 'Status', (order) => (
            <StatusChip status={order.rawStatus} fallbackLabel={order.status} />
        )),
        {
            id: 'actions',
            header: isId ? 'Tindakan' : 'Actions',
            enableSorting: false,
            cell: ({ row }) => {
                const order = row.original;
                const next = nextOrderStatus(role, order.rawStatus);
                const canAdvance =
                    canUpdate && order.id != null && next !== null;
                return (
                    <div className="orders-table-actions">
                        <Button
                            variant="secondary"
                            size="small"
                            leadingIcon={RiEyeLine}
                            aria-label={
                                (isId ? 'Detail pesanan ' : 'Order details ') +
                                orderNumber(order)
                            }
                            onClick={() => onSelect(order)}
                        >
                            {t('common.details')}
                        </Button>
                        {canAdvance && order.rawStatus && (
                            <Button
                                size="small"
                                variant={
                                    order.rawStatus === 'pending' ||
                                    order.rawStatus === 'ready'
                                        ? 'primary'
                                        : 'secondary'
                                }
                                aria-label={
                                    orderActionLabel(order.rawStatus, t) +
                                    ' ' +
                                    orderNumber(order)
                                }
                                onClick={() => onMove(order)}
                            >
                                {orderActionLabel(order.rawStatus, t)}
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];
}

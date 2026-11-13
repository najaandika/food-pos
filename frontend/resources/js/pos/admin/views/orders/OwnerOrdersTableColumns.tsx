import {
    RiQrCodeLine,
    RiRestaurantLine,
    RiShoppingBag3Line,
} from '@remixicon/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Chip } from '../../../../../../components/base/badges/chip';
import { Button } from '../../../../../../components/base/buttons/button';
import type { AdminOrder } from '../../runtime-data';
import { countItems, orderNumber, orderStatusLabel } from './order-ui';
import { displayTableReference } from '../../presentation-labels';
import { orderSortValue, statusColor } from './owner-orders-table-model';

export function createOwnerOrderColumns({
    locale,
    t,
    onOpenOrder,
}: {
    locale: string;
    t: (key: string) => string;
    onOpenOrder: (order: AdminOrder) => void;
}): ColumnDef<AdminOrder>[] {
    const isId = locale === 'id';
    const localized = (id: string, en: string) => (isId ? id : en);
    return [
        {
            id: 'order',
            accessorFn: orderSortValue,
            header: localized('Pesanan', 'Order'),
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <div className="od-order-identity">
                        <span className="od-order-avatar">
                            <RiShoppingBag3Line aria-hidden="true" />
                        </span>
                        <span className="od-order-identity-text">
                            <strong>{orderNumber(order)}</strong>
                            <small>
                                {order.name} · {countItems(order)}{' '}
                                {t('common.items')}
                            </small>
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'table',
            accessorFn: (order) => order.tableCode ?? order.table,
            header: localized('Meja / kanal', 'Table / channel'),
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <span className="od-order-table-pill">
                        {order.source === 'qr' ? (
                            <RiQrCodeLine aria-hidden="true" />
                        ) : (
                            <RiRestaurantLine aria-hidden="true" />
                        )}
                        {displayTableReference(
                            order.tableCode || order.table || '—',
                        )}
                    </span>
                );
            },
        },
        {
            id: 'time',
            header: localized('Jam masuk', 'Received'),
            enableSorting: false,
            cell: ({ row }) => (
                <span className="od-order-muted">
                    {row.original.time || '—'}
                </span>
            ),
        },
        {
            id: 'total',
            accessorFn: (order) =>
                order.rawTotal ??
                (Number(order.total.replace(/[^0-9]/g, '')) || 0),
            header: localized('Total', 'Total'),
            cell: ({ row }) => (
                <strong className="od-order-amount">
                    {row.original.total}
                </strong>
            ),
        },
        {
            id: 'status',
            accessorFn: (order) => order.rawStatus ?? order.status,
            header: localized('Status', 'Status'),
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <Chip
                        color={statusColor(order)}
                        variant="caption"
                        className="od-order-status-chip"
                    >
                        {order.rawStatus
                            ? orderStatusLabel(order.rawStatus, t)
                            : order.status}
                    </Chip>
                );
            },
        },
        {
            id: 'actions',
            header: localized('Aksi', 'Actions'),
            enableSorting: false,
            cell: ({ row }) => (
                <Button
                    variant="secondary"
                    size="xs"
                    aria-label={localized(
                        'Buka detail ' + orderNumber(row.original),
                        'Open details for ' + orderNumber(row.original),
                    )}
                    onClick={() => onOpenOrder(row.original)}
                >
                    {localized('Detail', 'Details')}
                </Button>
            ),
        },
    ];
}

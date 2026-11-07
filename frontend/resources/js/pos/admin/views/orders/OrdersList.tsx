'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import type {
    ColumnDef,
    PaginationState,
    SortingState,
} from '@tanstack/react-table';
import { RiEyeLine, RiArrowUpDownLine } from '@remixicon/react';
import type { UserRole } from '@/lib/pos-types';
import { Button } from '../../../../../../components/base/buttons/button';
import { Pagination } from '../../../../../../components/base/pagination/pagination';
import {
    SegmentedControl,
    SegmentedControlItem,
} from '../../../../../../components/base/segmented-control/segmented-control';
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
} from '../../../../../../components/base/table/table';
import type { AdminOrder } from '../../runtime-data';
import { useLocale } from '../../i18n-context';
import { StatusChip } from './StatusChip';
import {
    countItems,
    nextOrderStatus,
    orderActionLabel,
    orderIdentity,
    orderNumber,
    orderSourceLabel,
    ORDER_STATUSES,
} from './order-ui';

const PAGE_SIZE = 10;

type SortColumn =
    | 'order'
    | 'customer'
    | 'source'
    | 'time'
    | 'items'
    | 'total'
    | 'status';

const columnIds = [
    'order',
    'customer',
    'source',
    'time',
    'items',
    'total',
    'status',
    'actions',
] as const;

function minutesFromTime(text: string): number | string {
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

function sortValue(order: AdminOrder, column: SortColumn): string | number {
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

/** The installed BoardUI data-table entry is a customer-specific example.
 * Compose its actual pattern here: official BoardUI Table primitives backed by
 * TanStack for real sorting, pagination and stable row identity.
 */
export function OrdersList({
    orders,
    role,
    onSelect,
    onMove,
    canUpdate,
}: {
    orders: AdminOrder[];
    role: UserRole;
    onSelect: (order: AdminOrder) => void;
    onMove: (order: AdminOrder) => void;
    canUpdate: boolean;
}) {
    const { t, locale } = useLocale();
    const isId = locale === 'id';
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: PAGE_SIZE,
    });

    useEffect(() => {
        // OrdersView owns the search/status/source filters. A new filtered
        // result always starts from the first page.
        setPagination((current) =>
            current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
        );
    }, [orders]);

    const labels = isId
        ? [
              'Pesanan',
              'Meja & pelanggan',
              'Sumber',
              'Waktu',
              'Item',
              'Total',
              'Status',
              'Tindakan',
          ]
        : [
              'Order',
              'Table & customer',
              'Source',
              'Time',
              'Items',
              'Total',
              'Status',
              'Actions',
          ];

    const columns = useMemo<ColumnDef<AdminOrder>[]>(() => {
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
                <StatusChip
                    status={order.rawStatus}
                    fallbackLabel={order.status}
                />
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
                                    (isId
                                        ? 'Detail pesanan '
                                        : 'Order details ') + orderNumber(order)
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
    }, [canUpdate, isId, onMove, onSelect, role, t]);

    const table = useReactTable({
        data: orders,
        columns,
        getRowId: orderIdentity,
        state: { sorting, pagination },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const headerGroups = table.getHeaderGroups();
    const rows = table.getRowModel().rows;
    const totalPages = Math.max(1, table.getPageCount());
    const pageIndex = Math.min(pagination.pageIndex, totalPages - 1);
    const start = pageIndex * PAGE_SIZE;
    const currentSortKey = sorting[0]
        ? sorting[0].id + ':' + (sorting[0].desc ? 'descending' : 'ascending')
        : 'default';

    const mobileSorts = [
        { key: 'default', label: isId ? 'Asli' : 'Original' },
        {
            key: 'order:descending',
            label: isId ? 'Terbaru' : 'Newest',
        },
        {
            key: 'order:ascending',
            label: isId ? 'Terlama' : 'Oldest',
        },
        {
            key: 'total:descending',
            label: isId ? 'Termahal' : 'Highest',
        },
    ];
    const mobileSortKey = mobileSorts.some(
        (item) => item.key === currentSortKey,
    )
        ? currentSortKey
        : 'default';

    return (
        <section
            className="orders-list-surface"
            aria-label={isId ? 'Daftar pesanan' : 'Order list'}
        >
            <div className="orders-list-mobile-sort">
                <span className="text-caption-1-semibold">
                    {isId ? 'Urutkan pesanan' : 'Sort orders'}
                </span>
                <SegmentedControl
                    className="orders-list-mobile-segments"
                    aria-label={
                        isId ? 'Urutan daftar pesanan' : 'Order list sorting'
                    }
                    selectedKeys={new Set([mobileSortKey])}
                    onSelectionChange={(keys) => {
                        const key = String(Array.from(keys)[0] ?? 'default');
                        if (key === 'default') {
                            table.resetSorting();
                        } else {
                            const [column, direction] = key.split(':');
                            table.setSorting([
                                {
                                    id: column,
                                    desc: direction === 'descending',
                                },
                            ]);
                        }
                        table.setPageIndex(0);
                    }}
                >
                    {mobileSorts.map(({ key, label }) => (
                        <SegmentedControlItem id={key} key={key}>
                            {label}
                        </SegmentedControlItem>
                    ))}
                </SegmentedControl>
            </div>

            <Table
                size="sm"
                className="orders-data-table"
                containerClassName="orders-list-scroll"
                aria-label={
                    isId
                        ? 'Daftar pesanan operasional'
                        : 'Operational order list'
                }
                sortDescriptor={
                    sorting[0]
                        ? {
                              column: sorting[0].id,
                              direction: sorting[0].desc
                                  ? 'descending'
                                  : 'ascending',
                          }
                        : undefined
                }
                onSortChange={(next) => {
                    table.setSorting([
                        {
                            id: String(next.column),
                            desc: next.direction === 'descending',
                        },
                    ]);
                    table.setPageIndex(0);
                }}
            >
                <TableHeader>
                    {headerGroups[0]?.headers.map((header) => (
                        <TableColumn
                            key={header.id}
                            id={header.column.id}
                            isRowHeader={header.column.id === 'order'}
                            allowsSorting={header.column.getCanSort()}
                        >
                            <span className="orders-sort-heading">
                                {header.column.columnDef.header as string}
                                {header.column.getCanSort() && (
                                    <RiArrowUpDownLine
                                        className="orders-sort-icon"
                                        aria-hidden="true"
                                    />
                                )}
                            </span>
                        </TableColumn>
                    ))}
                </TableHeader>
                <TableBody
                    renderEmptyState={() => (
                        <div className="orders-table-empty text-body-medium text-text-tertiary">
                            {isId ? 'Tidak ada pesanan' : 'No orders'}
                        </div>
                    )}
                >
                    {rows.map((row) => (
                        <TableRow key={row.id} id={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <TableCell
                                    key={cell.id}
                                    data-label={
                                        labels[
                                            columnIds.indexOf(
                                                cell.column
                                                    .id as (typeof columnIds)[number],
                                            )
                                        ] ?? ''
                                    }
                                >
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext(),
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <div className="orders-list-footer">
                <p
                    className="orders-list-summary text-caption-1-regular"
                    aria-live="polite"
                >
                    {rows.length > 0
                        ? isId
                            ? `Menampilkan ${start + 1}–${start + rows.length} dari ${orders.length} pesanan`
                            : `Showing ${start + 1}–${start + rows.length} of ${orders.length} orders`
                        : isId
                          ? 'Tidak ada pesanan'
                          : 'No orders'}
                </p>
                {totalPages > 1 && (
                    <Pagination
                        page={pageIndex + 1}
                        totalPages={totalPages}
                        onChange={(page) => table.setPageIndex(page - 1)}
                        className="orders-pagination"
                        previousLabel={isId ? 'Sebelumnya' : 'Previous'}
                        nextLabel={isId ? 'Berikutnya' : 'Next'}
                        aria-label={
                            isId ? 'Halaman daftar pesanan' : 'Order list pages'
                        }
                    />
                )}
            </div>
        </section>
    );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { RiArrowUpDownLine } from '@remixicon/react';
import type { UserRole } from '@/lib/pos-types';
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
import { orderIdentity } from './order-ui';
import { createOrderColumns } from './OrdersListColumns';
import { columnIds } from './orders-list-model';

const PAGE_SIZE = 10;

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

    const columns = useMemo(
        () =>
            createOrderColumns({ role, isId, canUpdate, onSelect, onMove, t }),
        [canUpdate, isId, onMove, onSelect, role, t],
    );

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

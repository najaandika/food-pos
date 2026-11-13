'use client';

import { useMemo, useState } from 'react';
import {
    filterOwnerOrders,
    getOwnerOrdersPage,
    PER_PAGE,
    type SourceFilter,
    type StatusFilter,
} from './owner-orders-table-model';
import { createOwnerOrderColumns } from './OwnerOrdersTableColumns';
import {
    RiArrowDownLine,
    RiArrowUpDownLine,
    RiArrowUpLine,
    RiFileList3Line,
    RiSearchLine,
} from '@remixicon/react';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type SortingState,
} from '@tanstack/react-table';
import { Button } from '../../../../../../components/base/buttons/button';
import { Input } from '../../../../../../components/base/input/input';
import { Pagination } from '../../../../../../components/base/pagination/pagination';
import {
    Select,
    SelectItem,
} from '../../../../../../components/base/select/select';
import {
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from '../../../../../../components/base/table/table';
import { cx } from '../../../../../../utils/cx';
import { useLocale } from '../../i18n-context';
import type { AdminOrder } from '../../runtime-data';
import { orderIdentity } from './order-ui';

export function OwnerOrdersTable({
    orders,
    onOpenOrder,
    onViewOrders,
    recentLimit,
    totalOrders,
    readOnly = false,
}: {
    orders: AdminOrder[];
    onOpenOrder: (order: AdminOrder) => void;
    onViewOrders: () => void;
    recentLimit?: number;
    totalOrders?: number;
    readOnly?: boolean;
}) {
    const { locale, t } = useLocale();
    const isId = locale === 'id';
    const localized = (id: string, en: string) => (isId ? id : en);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [query, setQuery] = useState('');
    const [sorting, setSorting] = useState<SortingState>([
        { id: 'order', desc: true },
    ]);
    const [pageIndex, setPageIndex] = useState(0);

    const filtered = useMemo(
        () =>
            filterOwnerOrders(
                orders,
                statusFilter,
                sourceFilter,
                query,
                locale,
            ),
        [orders, statusFilter, sourceFilter, query, locale],
    );

    const { pages, safePageIndex, shownStart, shownEnd } = getOwnerOrdersPage(
        filtered.length,
        pageIndex,
    );
    const changeFilter = <T extends string>(
        setter: (value: T) => void,
        value: T,
    ) => {
        setter(value);
        setPageIndex(0);
    };

    const columns = useMemo(
        () => createOwnerOrderColumns({ locale, t, onOpenOrder }),
        [locale, t, onOpenOrder],
    );

    const table = useReactTable({
        data: filtered,
        columns,
        getRowId: orderIdentity,
        state: {
            sorting,
            pagination: { pageIndex: safePageIndex, pageSize: PER_PAGE },
        },
        onSortingChange: (updater) => {
            setSorting(updater);
            setPageIndex(0);
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const headers = table.getHeaderGroups()[0]?.headers ?? [];
    const visibleRows = table.getRowModel().rows;
    return (
        <section className="od-orders-panel" aria-labelledby="od-orders-title">
            <div className="od-orders-header">
                <div className="od-orders-title">
                    <span className="od-section-label">
                        {localized('OPERASIONAL', 'OPERATIONS')}
                    </span>
                    <h2 id="od-orders-title">
                        {localized('Pesanan terbaru', 'Recent orders')}
                    </h2>
                    <p>
                        {readOnly
                            ? localized(
                                  `${orders.length} terbaru dari ${totalOrders ?? orders.length} pesanan tersimpan · cari pada daftar ini`,
                                  `${orders.length} latest of ${totalOrders ?? orders.length} recorded orders · search within this list`,
                              )
                            : localized(
                                  filtered.length +
                                      ' dari ' +
                                      orders.length +
                                      ' pesanan',
                                  filtered.length +
                                      ' of ' +
                                      orders.length +
                                      ' orders',
                              )}
                    </p>
                </div>
                <div className="od-orders-controls">
                    <Select
                        size="sm"
                        aria-label={localized('Filter status', 'Filter status')}
                        selectedKey={statusFilter}
                        onSelectionChange={(key) =>
                            changeFilter(
                                setStatusFilter,
                                String(key) as StatusFilter,
                            )
                        }
                        className="od-orders-select"
                    >
                        <SelectItem
                            id="all"
                            textValue={localized(
                                'Semua status',
                                'All statuses',
                            )}
                        >
                            {localized('Semua status', 'All statuses')}
                        </SelectItem>
                        <SelectItem
                            id="attention"
                            textValue={localized('Prioritas', 'Priority')}
                        >
                            {localized('Prioritas', 'Priority')}
                        </SelectItem>
                        <SelectItem
                            id="waiting_payment"
                            textValue={localized(
                                'Menunggu bayar',
                                'Awaiting payment',
                            )}
                        >
                            {localized('Menunggu bayar', 'Awaiting payment')}
                        </SelectItem>
                        <SelectItem
                            id="paid"
                            textValue={localized('Lunas', 'Paid')}
                        >
                            {localized('Lunas', 'Paid')}
                        </SelectItem>
                        <SelectItem
                            id="cancelled"
                            textValue={localized('Dibatalkan', 'Cancelled')}
                        >
                            {localized('Dibatalkan', 'Cancelled')}
                        </SelectItem>
                    </Select>
                    <Select
                        size="sm"
                        aria-label={localized('Filter kanal', 'Filter channel')}
                        selectedKey={sourceFilter}
                        onSelectionChange={(key) =>
                            changeFilter(
                                setSourceFilter,
                                String(key) as SourceFilter,
                            )
                        }
                        className="od-orders-select"
                    >
                        <SelectItem
                            id="all"
                            textValue={localized('Semua kanal', 'All channels')}
                        >
                            {localized('Semua kanal', 'All channels')}
                        </SelectItem>
                        <SelectItem id="qr" textValue="QR">
                            QR
                        </SelectItem>
                        <SelectItem id="manual" textValue="Manual">
                            Manual
                        </SelectItem>
                    </Select>
                    <Input
                        type="search"
                        size="small"
                        value={query}
                        onChange={(value) => changeFilter(setQuery, value)}
                        leadingIcon={RiSearchLine}
                        placeholder={localized(
                            'Cari pesanan...',
                            'Search orders...',
                        )}
                        aria-label={localized('Cari pesanan', 'Search orders')}
                        className="od-order-search"
                        fieldClassName="pos-login-input-focus"
                    />
                    {!readOnly && (
                        <Button
                            size="small"
                            variant="secondary"
                            onClick={onViewOrders}
                        >
                            {localized('Lihat semua', 'View all')}
                        </Button>
                    )}
                </div>
            </div>
            <Table
                size="sm"
                aria-label={localized(
                    'Tabel pesanan terbaru',
                    'Recent orders table',
                )}
                selectionMode="none"
                containerClassName="od-order-table-scroll"
                className="od-order-table"
            >
                <TableHeader>
                    {headers.map((header) => {
                        const canSort = header.column.getCanSort();
                        const direction = header.column.getIsSorted();
                        const label = flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                        );
                        const sortName =
                            typeof header.column.columnDef.header === 'string'
                                ? header.column.columnDef.header
                                : header.column.id;
                        return (
                            <TableColumn
                                key={header.id}
                                id={header.column.id}
                                isRowHeader={header.column.id === 'order'}
                            >
                                {canSort ? (
                                    <button
                                        type="button"
                                        className={cx(
                                            'od-order-sort',
                                            direction &&
                                                'od-order-sort--active',
                                        )}
                                        aria-label={localized(
                                            'Urutkan ' + sortName,
                                            'Sort by ' + sortName,
                                        )}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        {label}
                                        {direction === 'asc' ? (
                                            <RiArrowUpLine aria-hidden="true" />
                                        ) : direction === 'desc' ? (
                                            <RiArrowDownLine aria-hidden="true" />
                                        ) : (
                                            <RiArrowUpDownLine aria-hidden="true" />
                                        )}
                                    </button>
                                ) : (
                                    label
                                )}
                            </TableColumn>
                        );
                    })}
                </TableHeader>
                <TableBody
                    renderEmptyState={() => (
                        <div className="od-empty-table">
                            <RiFileList3Line aria-hidden="true" />
                            <strong>
                                {localized(
                                    'Pesanan tidak ditemukan',
                                    'No matching orders',
                                )}
                            </strong>
                            <span>
                                {localized(
                                    'Ubah filter atau kata kunci pencarian.',
                                    'Try different filters or search terms.',
                                )}
                            </span>
                        </div>
                    )}
                >
                    {visibleRows.map((row) => (
                        <TableRow key={row.id} id={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
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
            <footer className="od-orders-footer">
                <span>
                    {localized(
                        'Menampilkan ' +
                            shownStart +
                            '–' +
                            shownEnd +
                            ' dari ' +
                            filtered.length +
                            ' pesanan',
                        'Showing ' +
                            shownStart +
                            '–' +
                            shownEnd +
                            ' of ' +
                            filtered.length +
                            ' orders',
                    )}
                </span>
                {pages > 1 ? (
                    <Pagination
                        page={safePageIndex + 1}
                        totalPages={pages}
                        onChange={(page) => setPageIndex(page - 1)}
                        className="od-orders-pagination"
                        previousLabel={localized('Sebelumnya', 'Previous')}
                        nextLabel={localized('Berikutnya', 'Next')}
                        aria-label={localized('Halaman pesanan', 'Order pages')}
                    />
                ) : !readOnly ? (
                    <Button variant="ghost" size="small" onClick={onViewOrders}>
                        {localized('Semua pesanan', 'All orders')}
                    </Button>
                ) : (
                    <span>
                        {localized(
                            `Maksimal ${recentLimit ?? orders.length} pesanan terbaru`,
                            `Latest ${recentLimit ?? orders.length} orders maximum`,
                        )}
                    </span>
                )}
            </footer>
        </section>
    );
}

'use client';

import { useMemo, useState } from 'react';
import {
    RiArrowDownLine,
    RiArrowUpDownLine,
    RiArrowUpLine,
    RiFileList3Line,
    RiQrCodeLine,
    RiRestaurantLine,
    RiSearchLine,
    RiShoppingBag3Line,
} from '@remixicon/react';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
} from '@tanstack/react-table';
import {
    Chip,
    type ChipColor,
} from '../../../../../components/base/badges/chip';
import { Button } from '../../../../../components/base/buttons/button';
import { Input } from '../../../../../components/base/input/input';
import { Pagination } from '../../../../../components/base/pagination/pagination';
import {
    Select,
    SelectItem,
} from '../../../../../components/base/select/select';
import {
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from '../../../../../components/base/table/table';
import { cx } from '../../../../../utils/cx';
import { useLocale } from '../i18n-context';
import type { AdminOrder } from '../runtime-data';
import {
    countItems,
    orderIdentity,
    orderNumber,
    orderStatusLabel,
} from './orders/order-ui';

type StatusFilter =
    | 'all'
    | 'attention'
    | 'waiting_payment'
    | 'paid'
    | 'cancelled';
type SourceFilter = 'all' | 'qr' | 'manual';
const PER_PAGE = 8;

function statusColor(order: AdminOrder): ChipColor {
    switch (order.rawStatus) {
        case 'pending':
            return 'orange';
        case 'accepted':
            return 'blue';
        case 'preparing':
            return 'purple';
        case 'ready':
            return 'lime';
        case 'served':
            return 'cyan';
        case 'waiting_payment':
            return 'yellow';
        case 'paid':
            return 'lime';
        case 'cancelled':
            return 'rose';
        default:
            return 'gray';
    }
}

function orderSortValue(order: AdminOrder): number {
    if (order.id !== undefined) return order.id;
    const numeric = Number((order.orderNumber ?? '').replace(/\D/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
}

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

    const filtered = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase(locale);
        return orders.filter((order) => {
            const status = order.rawStatus;
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'attention'
                    ? status === 'pending' ||
                      status === 'ready' ||
                      status === 'waiting_payment'
                    : status === statusFilter);
            const matchesSource =
                sourceFilter === 'all' || order.source === sourceFilter;
            const matchesQuery =
                !normalized ||
                [
                    orderNumber(order),
                    String(order.id ?? ''),
                    order.name,
                    order.table,
                    order.tableCode ?? '',
                    order.status,
                    ...order.items.map(([name]) => name),
                ].some((value) =>
                    value.toLocaleLowerCase(locale).includes(normalized),
                );
            return matchesStatus && matchesSource && matchesQuery;
        });
    }, [orders, statusFilter, sourceFilter, query, locale]);

    const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const safePageIndex = Math.min(pageIndex, pages - 1);
    const changeFilter = <T extends string>(
        setter: (value: T) => void,
        value: T,
    ) => {
        setter(value);
        setPageIndex(0);
    };

    const columns = useMemo<ColumnDef<AdminOrder>[]>(
        () => [
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
                            {order.tableCode || order.table || '—'}
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
        ],
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
    const shownStart = filtered.length === 0 ? 0 : safePageIndex * PER_PAGE + 1;
    const shownEnd = Math.min(filtered.length, (safePageIndex + 1) * PER_PAGE);

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

'use client';

import { RiFileList3Line, RiSearchLine } from '@remixicon/react';
import { Chip } from '../../../../../../components/base/badges/chip';
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
import {
    formatJakartaDateTime,
    formatRupiah,
    PAYMENT_METHOD_NAMES,
    type ReportPayload,
    type PaymentMethodFilter,
    type PaymentStatusFilter,
    type ReportSort,
    type Localize,
} from './report-model';

export function ReportTransactions({
    report,
    loading,
    status,
    method,
    sort,
    searchInput,
    onStatus,
    onMethod,
    onSort,
    onSearch,
    onPage,
    localize,
    locale,
}: {
    report: ReportPayload;
    loading: boolean;
    status: PaymentStatusFilter;
    method: PaymentMethodFilter;
    sort: ReportSort;
    searchInput: string;
    onStatus: (value: PaymentStatusFilter) => void;
    onMethod: (value: PaymentMethodFilter) => void;
    onSort: (value: ReportSort) => void;
    onSearch: (value: string) => void;
    onPage: (page: number) => void;
    localize: Localize;
    locale: string;
}) {
    return (
        <section
            className="report-panel report-transactions"
            aria-labelledby="report-transactions-title"
            aria-busy={loading}
        >
            <div className="report-transactions-header">
                <div>
                    <span className="report-eyebrow">
                        {localize('TRANSAKSI', 'TRANSACTIONS')}
                    </span>
                    <h2 id="report-transactions-title">
                        {localize('Riwayat pembayaran', 'Payment history')}
                    </h2>
                    <p>
                        {localize(
                            String(report.transactions.total) +
                                ' hasil · 10 per halaman',
                            String(report.transactions.total) +
                                ' results · 10 per page',
                        )}
                    </p>
                </div>
                <div className="report-table-controls">
                    <Select
                        size="sm"
                        aria-label={localize(
                            'Filter metode pembayaran',
                            'Filter payment method',
                        )}
                        selectedKey={method}
                        onSelectionChange={(key) =>
                            onMethod(String(key) as PaymentMethodFilter)
                        }
                        className="report-filter-select"
                    >
                        <SelectItem
                            id="all"
                            textValue={localize('Semua metode', 'All methods')}
                        >
                            {localize('Semua metode', 'All methods')}
                        </SelectItem>
                        <SelectItem
                            id="cash"
                            textValue={localize('Tunai', 'Cash')}
                        >
                            {localize('Tunai', 'Cash')}
                        </SelectItem>
                        <SelectItem id="qris" textValue="QRIS">
                            QRIS
                        </SelectItem>
                        <SelectItem id="transfer" textValue="Transfer">
                            Transfer
                        </SelectItem>
                    </Select>
                    <Select
                        size="sm"
                        aria-label={localize(
                            'Filter status pembayaran',
                            'Filter payment status',
                        )}
                        selectedKey={status}
                        onSelectionChange={(key) =>
                            onStatus(String(key) as PaymentStatusFilter)
                        }
                        className="report-filter-select"
                    >
                        <SelectItem
                            id="all"
                            textValue={localize('Semua status', 'All statuses')}
                        >
                            {localize('Semua status', 'All statuses')}
                        </SelectItem>
                        <SelectItem
                            id="paid"
                            textValue={localize('Lunas', 'Paid')}
                        >
                            {localize('Lunas', 'Paid')}
                        </SelectItem>
                        <SelectItem
                            id="pending"
                            textValue={localize('Menunggu', 'Pending')}
                        >
                            {localize('Menunggu', 'Pending')}
                        </SelectItem>
                        <SelectItem
                            id="failed"
                            textValue={localize('Gagal', 'Failed')}
                        >
                            {localize('Gagal', 'Failed')}
                        </SelectItem>
                        <SelectItem id="refunded" textValue="Refund">
                            Refund
                        </SelectItem>
                    </Select>
                    <Select
                        size="sm"
                        aria-label={localize(
                            'Urutkan transaksi',
                            'Sort transactions',
                        )}
                        selectedKey={sort}
                        onSelectionChange={(key) =>
                            onSort(String(key) as ReportSort)
                        }
                        className="report-filter-select"
                    >
                        <SelectItem
                            id="recent"
                            textValue={localize('Terbaru', 'Newest')}
                        >
                            {localize('Terbaru', 'Newest')}
                        </SelectItem>
                        <SelectItem
                            id="amount_desc"
                            textValue={localize(
                                'Total terbesar',
                                'Largest amount',
                            )}
                        >
                            {localize('Total terbesar', 'Largest amount')}
                        </SelectItem>
                        <SelectItem
                            id="amount_asc"
                            textValue={localize(
                                'Total terkecil',
                                'Smallest amount',
                            )}
                        >
                            {localize('Total terkecil', 'Smallest amount')}
                        </SelectItem>
                    </Select>
                    <Input
                        type="search"
                        size="small"
                        leadingIcon={RiSearchLine}
                        value={searchInput}
                        onChange={onSearch}
                        aria-label={localize(
                            'Cari nomor pesanan, meja, pelanggan',
                            'Search order, table or customer',
                        )}
                        placeholder={localize(
                            'Cari transaksi...',
                            'Search transactions...',
                        )}
                        className="report-search"
                        fieldClassName="report-search-focus"
                    />
                </div>
            </div>
            <Table
                size="sm"
                selectionMode="none"
                aria-label={localize(
                    'Tabel pembayaran tersimpan',
                    'Recorded payment table',
                )}
                containerClassName="report-table-scroll"
                className="report-payment-table"
            >
                <TableHeader>
                    <TableColumn id="order" isRowHeader>
                        {localize('Pesanan', 'Order')}
                    </TableColumn>
                    <TableColumn id="method">
                        {localize('Metode', 'Method')}
                    </TableColumn>
                    <TableColumn id="status">Status</TableColumn>
                    <TableColumn id="date">
                        {localize('Waktu (WIB)', 'Time (Jakarta)')}
                    </TableColumn>
                    <TableColumn id="amount">
                        {localize('Jumlah', 'Amount')}
                    </TableColumn>
                </TableHeader>
                <TableBody
                    renderEmptyState={() => (
                        <div className="report-table-empty">
                            <RiFileList3Line aria-hidden="true" />
                            <strong>
                                {localize(
                                    'Tidak ada transaksi sesuai filter.',
                                    'No matching transactions.',
                                )}
                            </strong>
                        </div>
                    )}
                >
                    {report.transactions.items.map((row) => (
                        <TableRow id={String(row.id)} key={row.id}>
                            <TableCell>
                                <div className="report-order-identity">
                                    <strong>{row.orderNumber}</strong>
                                    <small>
                                        {row.customerName}
                                        {row.tableCode
                                            ? ' · ' + row.tableCode
                                            : ''}
                                    </small>
                                </div>
                            </TableCell>
                            <TableCell>
                                {PAYMENT_METHOD_NAMES[row.method] ?? row.method}
                            </TableCell>
                            <TableCell>
                                <Chip
                                    variant="caption"
                                    color={
                                        row.status === 'paid'
                                            ? 'lime'
                                            : row.status === 'pending'
                                              ? 'yellow'
                                              : row.status === 'refunded'
                                                ? 'purple'
                                                : 'rose'
                                    }
                                >
                                    {row.status === 'paid'
                                        ? localize('Lunas', 'Paid')
                                        : row.status === 'pending'
                                          ? localize('Menunggu', 'Pending')
                                          : row.status === 'refunded'
                                            ? 'Refund'
                                            : localize('Gagal', 'Failed')}
                                </Chip>
                            </TableCell>
                            <TableCell>
                                <span className="report-time">
                                    {formatJakartaDateTime(row.at, locale)}
                                </span>
                            </TableCell>
                            <TableCell>
                                <strong className="report-amount">
                                    {formatRupiah(row.amount)}
                                </strong>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <footer className="report-table-footer">
                <span>
                    {localize(
                        'Halaman ' +
                            report.transactions.page +
                            ' dari ' +
                            report.transactions.lastPage,
                        'Page ' +
                            report.transactions.page +
                            ' of ' +
                            report.transactions.lastPage,
                    )}
                </span>
                <Pagination
                    page={report.transactions.page}
                    totalPages={report.transactions.lastPage}
                    onChange={onPage}
                    previousLabel={localize('Sebelumnya', 'Previous')}
                    nextLabel={localize('Berikutnya', 'Next')}
                    aria-label={localize(
                        'Halaman transaksi',
                        'Transaction pages',
                    )}
                    className="report-pagination"
                />
            </footer>
        </section>
    );
}

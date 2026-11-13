import {
    RiAlarmWarningLine,
    RiBarChartBoxLine,
    RiCheckLine,
    RiFileCopyLine,
    RiPencilLine,
    RiPrinterLine,
    RiQrCodeLine,
} from '@remixicon/react';

import {
    StatCards,
    type Stat,
} from '../../../../../../components/application/dashboard/stat-cards';
import { StatusDot } from '../../../../../../components/base/badges/status-dot';
import { Button } from '../../../../../../components/base/buttons/button';
import { IconButton } from '../../../../../../components/base/buttons/icon-button';
import { SearchField } from '../../../../../../components/base/search-field/search-field';
import {
    SegmentedControl,
    SegmentedControlItem,
} from '../../../../../../components/base/segmented-control/segmented-control';
import { useLocale } from '../../i18n-context';
import type { AdminTable } from '../../runtime-data';
import { displayTableReference } from '../../presentation-labels';
import { getTableStatusDotColor, getTableStatusLabel } from './table-status';

type TableFilter = 'all' | 'available' | 'attention' | 'inactive';
const KPI_ICONS = [
    RiQrCodeLine,
    RiBarChartBoxLine,
    RiAlarmWarningLine,
] as const;

type Props = {
    tables: AdminTable[];
    filteredTables: AdminTable[];
    tableStats: Array<{ label: string; value: string; hint: string }>;
    activeFilter: TableFilter;
    query: string;
    selectedId: number | undefined;
    isCreating: boolean;
    selectedTable: AdminTable | undefined;
    copiedCode: string | null;
    onChangeFilter: (filter: TableFilter) => void;
    onChangeQuery: (query: string) => void;
    onClearFilters: () => void;
    onStartEdit: (table: AdminTable) => void;
    onPrintTable: (table: AdminTable) => void;
    onCopyLink: (table: AdminTable) => void;
};

export function OwnerTablesList({
    tables,
    filteredTables,
    tableStats,
    activeFilter,
    query,
    isCreating,
    selectedTable,
    copiedCode,
    onChangeFilter,
    onChangeQuery,
    onClearFilters,
    onStartEdit,
    onPrintTable,
    onCopyLink,
}: Props) {
    const { t, locale } = useLocale();

    const stats: Stat[] = tableStats.map((item, index) => ({
        icon: KPI_ICONS[index] ?? RiQrCodeLine,
        label: item.label,
        value: item.value,
        deltaColor: 'neutral',
    }));

    const filters: Array<{ value: TableFilter; label: string }> = [
        { value: 'all', label: t('common.all') },
        { value: 'available', label: t('common.available') },
        { value: 'attention', label: t('ownerTables.attention') },
        { value: 'inactive', label: t('common.inactive') },
    ];

    return (
        <section className="tables-main tables-p2-main">
            <StatCards
                stats={stats}
                columns={3}
                className="tables-summary tables-boardui-stats"
            />

            <div className="table-tools">
                <SearchField
                    className="tables-boardui-search"
                    fieldClassName="tables-focus-field"
                    shape="rounded"
                    aria-label={t('ownerTables.searchTable')}
                    placeholder={t('ownerTables.searchTable')}
                    value={query}
                    onChange={onChangeQuery}
                />
                <div className="tables-p2-filter-scroller">
                    <SegmentedControl
                        className="tables-boardui-filters"
                        aria-label={
                            locale === 'id'
                                ? 'Filter status meja'
                                : 'Filter table status'
                        }
                        selectedKeys={new Set([activeFilter])}
                        onSelectionChange={(keys) => {
                            const next = Array.from(keys)[0] as
                                | TableFilter
                                | undefined;
                            if (next) onChangeFilter(next);
                        }}
                    >
                        {filters.map((filter) => (
                            <SegmentedControlItem
                                id={filter.value}
                                key={filter.value}
                            >
                                {filter.label}
                            </SegmentedControlItem>
                        ))}
                    </SegmentedControl>
                </div>
                <p className="tables-result-count text-caption-1-regular">
                    {filteredTables.length} {t('ownerTables.tables')}
                </p>
            </div>

            <div className="qr-table-grid">
                {filteredTables.map((table) => {
                    const status = table.rawStatus ?? 'available';
                    const isInactive = status === 'inactive';
                    const copied = copiedCode === table.code;
                    return (
                        <article
                            className={`qr-table-card ${table.tone} ${table.id === selectedTable?.id && !isCreating ? 'selected' : ''}`}
                            key={table.id ?? table.code}
                        >
                            <button
                                className="qr-card-top"
                                type="button"
                                onClick={() => onStartEdit(table)}
                            >
                                <span
                                    className="table-pill"
                                    data-table-code={table.code}
                                >
                                    {displayTableReference(table.code)}
                                </span>
                                <span className="tables-p2-card-identity">
                                    <strong className="text-body-medium">
                                        {table.name}
                                    </strong>
                                    <small className="text-body-2-regular">
                                        {table.area} · {table.seats}{' '}
                                        {t('ownerTables.seats')}
                                    </small>
                                </span>
                            </button>
                            <div className="qr-card-body">
                                <IconButton
                                    icon={RiQrCodeLine}
                                    className="tables-qr-preview-trigger"
                                    aria-label={'Preview QR meja ' + table.code}
                                    title={
                                        isInactive
                                            ? 'Aktifkan meja untuk menggunakan QR'
                                            : t('ownerTables.printStandee')
                                    }
                                    disabled={isInactive}
                                    onClick={() => onPrintTable(table)}
                                />
                                <div className="tables-p2-card-meta">
                                    <span className="tables-p2-status-chip">
                                        <StatusDot
                                            color={getTableStatusDotColor(
                                                status,
                                            )}
                                        />
                                        {getTableStatusLabel(status, locale)}
                                    </span>
                                    <p className="text-caption-1-medium">
                                        {table.currentOrderId
                                            ? (locale === 'id'
                                                  ? 'Pesanan aktif #'
                                                  : 'Active order #') +
                                              table.currentOrderId
                                            : locale === 'id'
                                              ? 'Belum ada pesanan aktif'
                                              : 'No active orders'}
                                    </p>
                                    <small className="text-caption-1-regular">
                                        {table.scans}{' '}
                                        {t('ownerTables.scansTodaySuffix')}
                                    </small>
                                </div>
                            </div>
                            <div className="qr-card-bottom">
                                <span className="text-caption-1-medium">
                                    {locale === 'id' ? 'QR Meja' : 'Table QR'}{' '}
                                    {displayTableReference(table.code)}
                                </span>
                                <div className="qr-card-actions">
                                    <IconButton
                                        icon={RiPrinterLine}
                                        className="tables-p2-icon-action"
                                        aria-label={`${t('ownerTables.printStandee')} ${table.code}`}
                                        title={
                                            isInactive
                                                ? 'QR tidak aktif'
                                                : t('ownerTables.printStandee')
                                        }
                                        disabled={isInactive}
                                        onClick={() => onPrintTable(table)}
                                    />
                                    <IconButton
                                        icon={
                                            copied
                                                ? RiCheckLine
                                                : RiFileCopyLine
                                        }
                                        className={
                                            copied
                                                ? 'tables-p2-icon-action tables-p2-copied'
                                                : 'tables-p2-icon-action'
                                        }
                                        aria-label={`${t('ownerTables.copyLink')} ${table.code}`}
                                        title={
                                            isInactive
                                                ? 'QR tidak aktif'
                                                : t('ownerTables.copyLink')
                                        }
                                        disabled={isInactive}
                                        onClick={() => onCopyLink(table)}
                                    />
                                    <IconButton
                                        icon={RiPencilLine}
                                        className="tables-p2-icon-action"
                                        aria-label={`${t('ownerTables.editTable')} ${table.code}`}
                                        title={t('ownerTables.editTable')}
                                        onClick={() => onStartEdit(table)}
                                    />
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>

            {filteredTables.length === 0 && (
                <div className="tables-empty-state">
                    <RiQrCodeLine
                        className="tables-p2-empty-icon"
                        aria-hidden
                    />
                    <strong className="text-headline-medium">
                        {tables.length === 0
                            ? locale === 'id'
                                ? 'Belum ada meja tersimpan'
                                : 'No saved tables yet'
                            : t('ownerTables.noTablesFound')}
                    </strong>
                    <p className="text-body-regular">
                        {tables.length === 0
                            ? locale === 'id'
                                ? 'Tambahkan dan simpan meja agar QR pemesanan bisa digunakan.'
                                : 'Add and save a table before generating its ordering QR.'
                            : t('ownerTables.noTablesFoundHint')}
                    </p>
                    {tables.length > 0 && (
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={onClearFilters}
                        >
                            {t('ownerTables.resetFilters')}
                        </Button>
                    )}
                </div>
            )}
        </section>
    );
}

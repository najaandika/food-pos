import { useMemo, useState } from 'react';
import {
    RiArrowRightSLine,
    RiGroupLine,
    RiMapPinLine,
    RiSearchLine,
} from '@remixicon/react';
import { Chip } from '../../../../../../components/base/badges/chip';
import { StatusDot } from '../../../../../../components/base/badges/status-dot';
import { Button } from '../../../../../../components/base/buttons/button';
import { Input } from '../../../../../../components/base/input/input';
import {
    SegmentedControl,
    SegmentedControlItem,
} from '../../../../../../components/base/segmented-control/segmented-control';
import { cx } from '../../../../../../utils/cx';
import { useLocale } from '../../i18n-context';
import type { AdminOrder, AdminTable } from '../../runtime-data';
import { activeOrderFor, tableKey, tableStatusStyles } from './waiter-model';

type TableGridProps = {
    tables: AdminTable[];
    orders: AdminOrder[];
    onOpenTable: (table: AdminTable) => void;
};

export function TableGrid({ tables, orders, onOpenTable }: TableGridProps) {
    const { t, locale } = useLocale();
    const isId = locale === 'id';
    const [tableSearch, setTableSearch] = useState('');
    const [area, setArea] = useState('all');
    const tableStatuses = tableStatusStyles(t);
    const areas = useMemo(
        () => [...new Set(tables.map((table) => table.area).filter(Boolean))],
        [tables],
    );
    const visibleTables = tables.filter(
        (table) =>
            (area === 'all' || table.area === area) &&
            (table.code + ' ' + table.name + ' ' + table.area)
                .toLowerCase()
                .includes(tableSearch.trim().toLowerCase()),
    );
    const areaOptions = [
        { key: 'all', label: t('waiters.allArea') },
        ...areas.map((key) => ({ key, label: key })),
    ];

    return (
        <section
            className="waiters-boardui-panel waiters-table-section"
            aria-labelledby="waiters-tables-heading"
        >
            <div className="waiters-section-head text-body-2-regular">
                <div>
                    <p className="waiters-section-label text-caption-2-semibold">
                        {isId ? 'STATUS OPERASIONAL' : 'OPERATIONAL STATUS'}
                    </p>
                    <h2
                        id="waiters-tables-heading"
                        className="text-title-3-semibold"
                    >
                        {t('waiters.tableStatus')}
                    </h2>
                    <p>{t('waiters.monitorTables')}</p>
                </div>
                <Chip variant="caption" color="neutral">
                    {visibleTables.length} {isId ? 'meja' : 'tables'}
                </Chip>
            </div>
            <div className="waiters-table-tools">
                <Input
                    type="search"
                    leadingIcon={RiSearchLine}
                    className="waiters-search"
                    aria-label={
                        isId ? 'Cari meja atau area' : 'Search tables or areas'
                    }
                    placeholder={
                        isId
                            ? 'Cari meja atau area…'
                            : 'Search tables or areas…'
                    }
                    value={tableSearch}
                    onChange={setTableSearch}
                />
                <div className="waiters-filter-scroll">
                    <SegmentedControl
                        className="waiters-boardui-segments"
                        aria-label={
                            isId ? 'Filter area meja' : 'Filter table area'
                        }
                        selectedKeys={new Set([area])}
                        onSelectionChange={(keys) => {
                            const next = Array.from(keys)[0];
                            if (typeof next === 'string') setArea(next);
                        }}
                    >
                        {areaOptions.map((item) => (
                            <SegmentedControlItem key={item.key} id={item.key}>
                                {item.label}
                            </SegmentedControlItem>
                        ))}
                    </SegmentedControl>
                </div>
            </div>
            <div className="waiters-floor-legend text-caption-1-regular">
                <span>
                    <StatusDot color="green" /> {t('common.available')}
                </span>
                <span>
                    <StatusDot color="yellow" /> {t('dashboard.preparing')}
                </span>
                <span>
                    <StatusDot color="indigo" /> {t('dashboard.ready')}
                </span>
                <span>
                    <span className="waiters-call-dot" aria-hidden="true" />{' '}
                    {t('waiters.customerCalls')}
                </span>
            </div>
            <div className="waiters-table-grid">
                {visibleTables.map((table) => {
                    const status =
                        tableStatuses[table.rawStatus ?? 'available'];
                    const linked = activeOrderFor(table, orders);
                    return (
                        <button
                            key={tableKey(table)}
                            type="button"
                            className={cx(
                                'waiters-table-tile',
                                table.rawStatus === 'need_waiter' &&
                                    'needs-attention',
                            )}
                            aria-label={
                                table.code +
                                ', ' +
                                table.name +
                                ', ' +
                                status.label
                            }
                            onClick={() => onOpenTable(table)}
                        >
                            <div className="waiters-table-tile-top">
                                <strong className="waiters-table-code text-headline-semibold">
                                    {table.code}
                                </strong>
                                <Chip variant="caption" color={status.color}>
                                    {status.label}
                                </Chip>
                            </div>
                            <p className="waiters-table-name text-body-semibold">
                                {table.name}
                            </p>
                            <div className="waiters-table-meta text-caption-1-regular">
                                <span>
                                    <RiGroupLine aria-hidden="true" />{' '}
                                    {table.seats} {t('waiters.seats')}
                                </span>
                                <span>
                                    <RiMapPinLine aria-hidden="true" />{' '}
                                    {table.area}
                                </span>
                            </div>
                            <div className="waiters-table-bottom text-caption-1-regular">
                                <span>{linked?.name ?? table.lastOrder}</span>
                                <RiArrowRightSLine aria-hidden="true" />
                            </div>
                        </button>
                    );
                })}
            </div>
            {!visibleTables.length && (
                <div className="waiters-boardui-empty text-body-2-regular">
                    <RiSearchLine aria-hidden="true" />
                    <p>
                        {isId
                            ? 'Tidak ada meja yang sesuai.'
                            : 'No matching tables.'}
                    </p>
                    <Button
                        size="small"
                        variant="secondary"
                        onClick={() => {
                            setTableSearch('');
                            setArea('all');
                        }}
                    >
                        {isId ? 'Reset filter' : 'Clear filters'}
                    </Button>
                </div>
            )}
        </section>
    );
}

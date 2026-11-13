'use client';

import { useMemo, useState } from 'react';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
    RiArrowUpDownLine,
    RiCloseCircleLine,
    RiFilter3Line,
    RiPencilLine,
    RiSearchLine,
    RiUserUnfollowLine,
    RiGroupLine,
} from '@remixicon/react';
import { Avatar } from '../../../../../../components/base/avatar/avatar';
import {
    Chip,
    type ChipColor,
} from '../../../../../../components/base/badges/chip';
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
import { useLocale } from '../../i18n-context';
import type { AdminStaff } from '../../runtime-data';
import { PAGE_SIZE } from './owner-staff-model';

type RoleFilter = 'all' | 'owner' | 'kasir' | 'waiters';
type StatusFilter = 'all' | 'active' | 'inactive';

type Props = {
    staff: AdminStaff[];
    filteredStaff: AdminStaff[];
    visibleStaff: AdminStaff[];
    roleFilter: RoleFilter;
    statusFilter: StatusFilter;
    query: string;
    page: number;
    totalPages: number;
    onChangeRole: (value: RoleFilter) => void;
    onChangeStatus: (value: StatusFilter) => void;
    onChangeQuery: (value: string) => void;
    onPageChange: (page: number) => void;
    onClearFilters: () => void;
    onStartEdit: (person: AdminStaff) => void;
    onDisable: (person: AdminStaff) => void;
};

function initials(name: string) {
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0] ?? '')
            .join('')
            .toUpperCase() || 'S'
    );
}

function roleColor(role: AdminStaff['role']): ChipColor {
    if (role === 'owner') return 'blue';
    if (role === 'kasir') return 'lime';
    return 'cyan';
}

export function OwnerStaffList({
    staff,
    filteredStaff,
    roleFilter,
    statusFilter,
    query,
    page,
    totalPages,
    onChangeRole,
    onChangeStatus,
    onChangeQuery,
    onPageChange,
    onClearFilters,
    onStartEdit,
    onDisable,
}: Props) {
    const { t, locale } = useLocale();
    const isId = locale === 'id';
    const hasFilter =
        roleFilter !== 'all' || statusFilter !== 'all' || query.trim() !== '';
    const [sorting, setSorting] = useState<SortingState>([]);

    const actionsFor = (person: AdminStaff) => (
        <div className="staff-finance-actions">
            <Button
                size="small"
                variant="secondary"
                iconOnly
                leadingIcon={RiPencilLine}
                aria-label={t('ownerStaff.editStaff') + ' ' + person.name}
                title={t('ownerStaff.editStaff') + ' ' + person.name}
                onClick={() => onStartEdit(person)}
            />
            {person.isActive && (
                <Button
                    size="small"
                    variant="ghost"
                    iconOnly
                    leadingIcon={RiUserUnfollowLine}
                    aria-label={
                        t('ownerStaff.disableTitle') + ' ' + person.name
                    }
                    title={t('ownerStaff.disableTitle') + ' ' + person.name}
                    onClick={() => onDisable(person)}
                />
            )}
        </div>
    );

    const identity = (person: AdminStaff) => (
        <div className="staff-finance-identity">
            <Avatar
                size="lg"
                color={
                    person.role === 'owner'
                        ? 'blue'
                        : person.role === 'kasir'
                          ? 'lime'
                          : 'pink'
                }
                initials={initials(person.name)}
                alt=""
            />
            <div className="staff-finance-identity-text">
                <button
                    type="button"
                    className="staff-finance-name text-body-semibold"
                    onClick={() => onStartEdit(person)}
                >
                    {person.name}
                </button>
                <p className="text-caption-1-regular text-text-secondary">
                    {person.email}
                </p>
            </div>
        </div>
    );

    // Follow the official BoardUI Data Table composition: the accessible
    // React Aria Table renders TanStack's real filtered, sorted, paged rows.
    // Parent OwnerStaffView still owns role/status/search and page selection.
    // Sorting happens on ALL filtered staff before pagination, never just
    // the visible eight rows. No mock template customer records are loaded.
    const columns = useMemo<ColumnDef<AdminStaff>[]>(
        () => [
            {
                id: 'staff',
                accessorKey: 'name',
                header: isId ? 'Staf' : 'Staff',
            },
            {
                id: 'role',
                accessorKey: 'role',
                header: t('ownerStaff.role'),
            },
            {
                id: 'access',
                accessorFn: (person) => (person.isActive ? 1 : 0),
                header: isId ? 'Akses' : 'Access',
            },
            {
                id: 'activity',
                accessorKey: 'activity',
                header: isId ? 'Aktivitas' : 'Activity',
                enableSorting: false,
            },
            {
                id: 'actions',
                header: isId ? 'Tindakan' : 'Actions',
                enableSorting: false,
            },
        ],
        [isId, t],
    );

    const table = useReactTable({
        data: filteredStaff,
        columns,
        getRowId: (person) => String(person.id ?? person.email),
        state: {
            sorting,
            pagination: {
                pageIndex: Math.max(0, page - 1),
                pageSize: PAGE_SIZE,
            },
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    const rows = table.getRowModel().rows;
    const currentSort = sorting[0];
    const mobileSort =
        currentSort?.id === 'staff'
            ? currentSort.desc
                ? 'staff-desc'
                : 'staff-asc'
            : currentSort?.id === 'role'
              ? currentSort.desc
                  ? 'role-desc'
                  : 'role-asc'
              : currentSort?.id === 'access'
                ? currentSort.desc
                    ? 'active-first'
                    : 'inactive-first'
                : 'default';

    const updateSort = (key: string) => {
        if (key === 'default') {
            table.resetSorting();
        } else if (key === 'staff-asc') {
            table.setSorting([{ id: 'staff', desc: false }]);
        } else if (key === 'staff-desc') {
            table.setSorting([{ id: 'staff', desc: true }]);
        } else if (key === 'role-asc') {
            table.setSorting([{ id: 'role', desc: false }]);
        } else if (key === 'role-desc') {
            table.setSorting([{ id: 'role', desc: true }]);
        } else if (key === 'active-first') {
            table.setSorting([{ id: 'access', desc: true }]);
        } else if (key === 'inactive-first') {
            table.setSorting([{ id: 'access', desc: false }]);
        }
        onPageChange(1);
    };

    return (
        <section aria-labelledby="staff-directory-title">
            <div className="staff-finance-panel-heading">
                <div>
                    <div className="staff-finance-eyebrow text-caption-2-semibold">
                        {isId ? 'DIREKTORI STAF' : 'STAFF DIRECTORY'}
                    </div>
                    <h2
                        id="staff-directory-title"
                        className="text-title-3-semibold text-text-primary"
                    >
                        {isId ? 'Daftar akun staf' : 'Staff accounts'}
                    </h2>
                    <p className="text-body-2-regular text-text-secondary">
                        {isId
                            ? 'Kelola identitas, role, dan akses operasional.'
                            : 'Manage identities, roles and operational access.'}
                    </p>
                </div>
                <Chip variant="caption" color="blue">
                    {staff.length} {t('ownerStaff.members')}
                </Chip>
            </div>

            <div className="staff-finance-toolbar">
                <Input
                    size="small"
                    className="staff-finance-search"
                    type="search"
                    leadingIcon={RiSearchLine}
                    aria-label={t('ownerStaff.searchStaff')}
                    placeholder={t('ownerStaff.searchStaff')}
                    value={query}
                    onChange={onChangeQuery}
                />
                <div className="staff-finance-toolbar-filters">
                    <Select
                        size="sm"
                        aria-label={isId ? 'Urutkan staf' : 'Sort staff'}
                        selectedKey={mobileSort}
                        onSelectionChange={(key) => updateSort(String(key))}
                        className="staff-finance-sort"
                    >
                        <SelectItem id="default">
                            {isId ? 'Urutan asli' : 'Original order'}
                        </SelectItem>
                        <SelectItem id="staff-asc">
                            {isId ? 'Nama A–Z' : 'Name A–Z'}
                        </SelectItem>
                        <SelectItem id="staff-desc">
                            {isId ? 'Nama Z–A' : 'Name Z–A'}
                        </SelectItem>
                        <SelectItem id="role-asc">Role A–Z</SelectItem>
                        <SelectItem id="role-desc">Role Z–A</SelectItem>
                        <SelectItem id="active-first">
                            {isId ? 'Aktif lebih dulu' : 'Active first'}
                        </SelectItem>
                        <SelectItem id="inactive-first">
                            {isId ? 'Nonaktif lebih dulu' : 'Inactive first'}
                        </SelectItem>
                    </Select>
                    <Select
                        size="sm"
                        aria-label={
                            isId ? 'Filter berdasarkan role' : 'Filter by role'
                        }
                        selectedKey={roleFilter}
                        onSelectionChange={(key) =>
                            onChangeRole(String(key) as RoleFilter)
                        }
                    >
                        <SelectItem id="all">
                            {isId ? 'Semua role' : 'All roles'}
                        </SelectItem>
                        <SelectItem id="owner">Owner</SelectItem>
                        <SelectItem id="kasir">Kasir</SelectItem>
                        <SelectItem id="waiters">Waiters</SelectItem>
                    </Select>
                    <Select
                        size="sm"
                        aria-label={
                            isId
                                ? 'Filter berdasarkan status'
                                : 'Filter by status'
                        }
                        selectedKey={statusFilter}
                        onSelectionChange={(key) =>
                            onChangeStatus(String(key) as StatusFilter)
                        }
                    >
                        <SelectItem id="all">
                            {isId ? 'Semua status' : 'All statuses'}
                        </SelectItem>
                        <SelectItem id="active">
                            {t('common.active')}
                        </SelectItem>
                        <SelectItem id="inactive">
                            {t('common.inactive')}
                        </SelectItem>
                    </Select>
                    {hasFilter && (
                        <Button
                            size="small"
                            variant="ghost"
                            leadingIcon={RiCloseCircleLine}
                            onClick={onClearFilters}
                        >
                            {t('ownerStaff.resetFilters')}
                        </Button>
                    )}
                </div>
            </div>

            <div className="staff-finance-results text-caption-1-regular text-text-secondary">
                <RiFilter3Line className="size-4" aria-hidden="true" />
                {filteredStaff.length}{' '}
                {isId ? 'hasil ditampilkan' : 'matching results'}
            </div>

            <div className="staff-finance-desktop-table">
                <Table
                    size="md"
                    selectionMode="none"
                    aria-label={
                        isId ? 'Tabel data staf' : 'Staff directory table'
                    }
                    containerClassName="staff-finance-table-scroll"
                    sortDescriptor={
                        currentSort
                            ? {
                                  column: currentSort.id,
                                  direction: currentSort.desc
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
                        onPageChange(1);
                    }}
                >
                    <TableHeader>
                        {table.getHeaderGroups()[0]?.headers.map((header) => (
                            <TableColumn
                                key={header.id}
                                id={header.column.id}
                                isRowHeader={header.column.id === 'staff'}
                                allowsSorting={header.column.getCanSort()}
                            >
                                <span className="staff-finance-sort-heading">
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                    )}
                                    {header.column.getCanSort() && (
                                        <RiArrowUpDownLine
                                            className="staff-finance-sort-icon"
                                            aria-hidden="true"
                                        />
                                    )}
                                </span>
                            </TableColumn>
                        ))}
                    </TableHeader>
                    <TableBody
                        renderEmptyState={() => (
                            <div className="staff-finance-empty">
                                <RiGroupLine
                                    className="text-foreground-icon-secondary size-6"
                                    aria-hidden="true"
                                />
                                <strong className="text-body-semibold text-text-primary">
                                    {t('ownerStaff.noStaffFound')}
                                </strong>
                                <p className="text-body-2-regular text-text-secondary">
                                    {t('ownerStaff.noStaffFoundHint')}
                                </p>
                                {hasFilter && (
                                    <Button
                                        variant="secondary"
                                        size="small"
                                        onClick={onClearFilters}
                                    >
                                        {t('ownerStaff.resetFilters')}
                                    </Button>
                                )}
                            </div>
                        )}
                    >
                        {rows.map((row) => {
                            const person = row.original;
                            return (
                                <TableRow
                                    key={person.id ?? person.email}
                                    id={String(person.id ?? person.email)}
                                >
                                    <TableCell>{identity(person)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            variant="caption"
                                            color={roleColor(person.role)}
                                        >
                                            {person.roleLabel}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            variant="caption"
                                            color={
                                                person.isActive
                                                    ? 'lime'
                                                    : 'rose'
                                            }
                                        >
                                            {person.isActive
                                                ? t('common.active')
                                                : t('common.inactive')}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>
                                        <div className="staff-finance-activity">
                                            <span className="text-body-2-medium text-text-primary">
                                                {person.shift}
                                            </span>
                                            <span className="text-caption-1-regular text-text-secondary">
                                                {person.activity}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{actionsFor(person)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <div className="staff-finance-mobile-list">
                {rows.map((row) => {
                    const person = row.original;
                    return (
                        <article
                            className="staff-finance-mobile-card"
                            key={person.id ?? person.email}
                        >
                            <div className="staff-finance-mobile-head">
                                {identity(person)}
                                {actionsFor(person)}
                            </div>
                            <div className="staff-finance-mobile-meta">
                                <Chip
                                    variant="caption"
                                    color={roleColor(person.role)}
                                >
                                    {person.roleLabel}
                                </Chip>
                                <Chip
                                    variant="caption"
                                    color={person.isActive ? 'lime' : 'rose'}
                                >
                                    {person.isActive
                                        ? t('common.active')
                                        : t('common.inactive')}
                                </Chip>
                            </div>
                            <p className="text-caption-1-regular text-text-secondary">
                                {person.shift} · {person.activity}
                            </p>
                        </article>
                    );
                })}
                {!rows.length && (
                    <div className="staff-finance-empty">
                        <RiGroupLine
                            className="text-foreground-icon-secondary size-6"
                            aria-hidden="true"
                        />
                        <strong className="text-body-semibold">
                            {t('ownerStaff.noStaffFound')}
                        </strong>
                        {hasFilter && (
                            <Button
                                size="small"
                                variant="secondary"
                                onClick={onClearFilters}
                            >
                                {t('ownerStaff.resetFilters')}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="staff-finance-pagination">
                <span className="text-caption-1-regular text-text-secondary">
                    {filteredStaff.length ? (page - 1) * PAGE_SIZE + 1 : 0}–
                    {Math.min(page * PAGE_SIZE, filteredStaff.length)}{' '}
                    {isId ? 'dari' : 'of'} {filteredStaff.length}
                </span>
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onChange={onPageChange}
                    aria-label={
                        isId
                            ? 'Halaman daftar staf'
                            : 'Staff directory pagination'
                    }
                    previousLabel={isId ? 'Sebelumnya' : 'Previous'}
                    nextLabel={isId ? 'Berikutnya' : 'Next'}
                />
            </div>
        </section>
    );
}

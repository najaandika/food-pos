import {
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
    if (role === 'kasir') return 'purple';
    return 'cyan';
}

export function OwnerStaffList({
    staff,
    filteredStaff,
    visibleStaff,
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
                color={person.role === 'owner' ? 'blue' : 'neutral'}
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
                <Chip variant="caption" color="neutral">
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
                >
                    <TableHeader>
                        <TableColumn id="staff" isRowHeader>
                            {isId ? 'Staf' : 'Staff'}
                        </TableColumn>
                        <TableColumn id="role">
                            {t('ownerStaff.role')}
                        </TableColumn>
                        <TableColumn id="access">
                            {isId ? 'Akses' : 'Access'}
                        </TableColumn>
                        <TableColumn id="activity">
                            {isId ? 'Aktivitas' : 'Activity'}
                        </TableColumn>
                        <TableColumn id="actions">
                            {isId ? 'Tindakan' : 'Actions'}
                        </TableColumn>
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
                        {visibleStaff.map((person) => (
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
                                            person.isActive ? 'lime' : 'rose'
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
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="staff-finance-mobile-list">
                {visibleStaff.map((person) => (
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
                ))}
                {!visibleStaff.length && (
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
                    {filteredStaff.length ? (page - 1) * 8 + 1 : 0}–
                    {Math.min(page * 8, filteredStaff.length)}{' '}
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

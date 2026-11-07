import { useMemo, useState } from 'react';
import {
    RiGroupLine,
    RiShieldUserLine,
    RiAddLine,
    RiUserFollowLine,
    RiUserUnfollowLine,
} from '@remixicon/react';
import { StatCards } from '../../../../../components/application/dashboard/stat-cards';
import { Button } from '../../../../../components/base/buttons/button';
import { Drawer } from '../../../../../components/base/drawer/drawer';
import {
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
} from '../../../../../components/base/modal/modal';
import { cx } from '../../../../../utils/cx';
import { AdminTitle } from '..';
import { useLocale } from '../i18n-context';
import type { AdminStaff } from '../runtime-data';
import { OwnerStaffForm, type StaffDraft } from './owner-staff/OwnerStaffForm';
import { OwnerStaffList } from './owner-staff/OwnerStaffList';

type StaffRole = 'owner' | 'kasir' | 'waiters';
type StaffRoleFilter = 'all' | StaffRole;
type StaffStatusFilter = 'all' | 'active' | 'inactive';

type StaffFormPayload = {
    name: string;
    email: string;
    role: StaffRole;
    password?: string;
    isActive: boolean;
};

const blankStaff: StaffDraft = {
    name: '',
    email: '',
    role: 'waiters',
    password: '',
    isActive: true,
};

function draftFromStaff(person: AdminStaff): StaffDraft {
    return {
        name: person.name,
        email: person.email,
        role: person.role,
        password: '',
        isActive: person.isActive,
    };
}

function payloadFromDraft(draft: StaffDraft): StaffFormPayload {
    return {
        name: draft.name.trim(),
        email: draft.email.trim().toLowerCase(),
        role: draft.role,
        password: draft.password.trim() || undefined,
        isActive: draft.isActive,
    };
}

const PAGE_SIZE = 8;

export function OwnerStaffView({
    staff = [],
    onCreateStaff,
    onUpdateStaff,
    onDisableStaff,
}: {
    staff?: AdminStaff[];
    onCreateStaff?: (payload: StaffFormPayload) => Promise<void> | void;
    onUpdateStaff?: (
        staffId: number | undefined,
        payload: StaffFormPayload,
    ) => Promise<void> | void;
    onDisableStaff?: (staffId: number | undefined) => Promise<void> | void;
}) {
    const { t, locale } = useLocale();
    const isId = locale === 'id';
    const [roleFilter, setRoleFilter] = useState<StaffRoleFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>('all');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [isEditorOpen, setEditorOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedId, setSelectedId] = useState<number>();
    const [draft, setDraft] = useState<StaffDraft>(blankStaff);
    const [isSaving, setSaving] = useState(false);
    const [staffToDisable, setStaffToDisable] = useState<AdminStaff | null>(
        null,
    );
    const [error, setError] = useState('');

    const selectedStaff = staff.find((person) => person.id === selectedId);

    const filteredStaff = useMemo(() => {
        const term = query.trim().toLocaleLowerCase();
        return staff.filter((person) => {
            const matchRole =
                roleFilter === 'all' || person.role === roleFilter;
            const matchStatus =
                statusFilter === 'all' ||
                person.isActive === (statusFilter === 'active');
            const matchText =
                term.length === 0 ||
                [person.name, person.email, person.roleLabel, person.area]
                    .join(' ')
                    .toLocaleLowerCase()
                    .includes(term);
            return matchRole && matchStatus && matchText;
        });
    }, [staff, roleFilter, statusFilter, query]);

    const totalPages = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const visibleStaff = filteredStaff.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );

    const stats = [
        {
            icon: RiGroupLine,
            label: t('ownerStaff.totalStaff'),
            value: String(staff.length),
            deltaColor: 'neutral' as const,
        },
        {
            icon: RiUserFollowLine,
            label: t('ownerStaff.onShift'),
            value: String(staff.filter((person) => person.isActive).length),
            deltaColor: 'neutral' as const,
        },
        {
            icon: RiUserUnfollowLine,
            label: t('ownerStaff.inactiveStaff'),
            value: String(staff.filter((person) => !person.isActive).length),
            deltaColor: 'neutral' as const,
        },
        {
            icon: RiShieldUserLine,
            label: isId ? 'Akun Owner' : 'Owner accounts',
            value: String(
                staff.filter((person) => person.role === 'owner').length,
            ),
            deltaColor: 'neutral' as const,
        },
    ];

    const permissionPreview = useMemo(() => {
        if (draft.role === 'owner')
            return [
                t('perm.fullDashboard'),
                t('perm.manageMenuTables'),
                t('perm.viewReports'),
                t('perm.manageStaff'),
            ];
        if (draft.role === 'kasir')
            return [
                t('perm.openCashier'),
                t('perm.closePayment'),
                t('perm.printBills'),
                t('perm.viewTickets'),
            ];
        return [
            t('perm.viewTable'),
            t('perm.confirmCalls'),
            t('perm.updateProgress'),
            t('perm.markServed'),
        ];
    }, [draft.role, t]);

    const startCreate = () => {
        setError('');
        setIsCreating(true);
        setSelectedId(undefined);
        setDraft({ ...blankStaff });
        setEditorOpen(true);
    };

    const startEdit = (person: AdminStaff) => {
        setError('');
        setIsCreating(false);
        setSelectedId(person.id);
        setDraft(draftFromStaff(person));
        setEditorOpen(true);
    };

    const clearFilters = () => {
        setRoleFilter('all');
        setStatusFilter('all');
        setQuery('');
        setPage(1);
    };

    const closeEditor = () => {
        if (isSaving) return;
        setEditorOpen(false);
        setError('');
    };

    const saveStaff = async () => {
        if (isSaving) return;
        const payload = payloadFromDraft(draft);
        if (
            payload.name.length < 2 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
        ) {
            setError(
                isId
                    ? 'Masukkan nama minimal 2 karakter dan alamat email yang valid.'
                    : 'Enter a name of at least 2 characters and a valid email.',
            );
            return;
        }
        if (isCreating && !onCreateStaff) {
            setError(
                isId
                    ? 'Aksi menambah staf tidak tersedia.'
                    : 'Create staff is not available.',
            );
            return;
        }
        if (!isCreating && (!selectedStaff || !onUpdateStaff)) {
            setError(
                isId
                    ? 'Aksi mengubah staf tidak tersedia.'
                    : 'Update staff is not available.',
            );
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (isCreating) await onCreateStaff?.(payload);
            else await onUpdateStaff?.(selectedStaff?.id, payload);
            setEditorOpen(false);
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : isId
                      ? 'Gagal menyimpan perubahan. Coba lagi.'
                      : 'Could not save changes. Try again.',
            );
        } finally {
            setSaving(false);
        }
    };

    const confirmDisableStaff = async () => {
        const person = staffToDisable;
        if (!person || isSaving) return;
        if (!onDisableStaff) {
            setError(
                isId
                    ? 'Aksi menonaktifkan staf belum tersedia.'
                    : 'Disable staff is not available.',
            );
            setStaffToDisable(null);
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onDisableStaff(person.id);
            setStaffToDisable(null);
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : isId
                      ? 'Gagal menonaktifkan akun.'
                      : 'Could not disable account.',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="app-view active staff-finance-page">
            <header className="staff-finance-header">
                <div className="min-w-0">
                    <AdminTitle
                        title={t('ownerStaff.title')}
                        subtitle={t('ownerStaff.subtitle')}
                    />
                </div>
                <Button
                    variant="primary"
                    leadingIcon={RiAddLine}
                    className="pos-boardui-add-button"
                    onClick={startCreate}
                >
                    {t('ownerStaff.addStaff')}
                </Button>
            </header>

            <div className="staff-finance-summary">
                <StatCards columns={4} stats={stats} />
            </div>

            <div className="staff-finance-table-panel">
                <OwnerStaffList
                    staff={staff}
                    filteredStaff={filteredStaff}
                    visibleStaff={visibleStaff}
                    roleFilter={roleFilter}
                    statusFilter={statusFilter}
                    query={query}
                    page={currentPage}
                    totalPages={totalPages}
                    onChangeRole={(next) => {
                        setRoleFilter(next);
                        setPage(1);
                    }}
                    onChangeStatus={(next) => {
                        setStatusFilter(next);
                        setPage(1);
                    }}
                    onChangeQuery={(next) => {
                        setQuery(next);
                        setPage(1);
                    }}
                    onPageChange={setPage}
                    onClearFilters={clearFilters}
                    onStartEdit={startEdit}
                    onDisable={setStaffToDisable}
                />
            </div>
            <p className="staff-finance-session-note text-caption-1-regular text-text-tertiary">
                {isId
                    ? 'Pengelolaan staf saat ini masih menggunakan data sesi. Perubahan belum disimpan permanen ke Laravel.'
                    : 'Staff management currently uses session data; changes are not yet persisted to Laravel.'}
            </p>

            <Drawer
                isOpen={isEditorOpen}
                placement="end"
                size="md"
                className="staff-finance-drawer-dialog"
                overlayClassName="staff-finance-drawer-overlay"
                isDismissable={!isSaving}
                isKeyboardDismissDisabled={isSaving}
                onOpenChange={(open) => {
                    if (!open) closeEditor();
                }}
            >
                <OwnerStaffForm
                    draft={draft}
                    onChangeDraft={setDraft}
                    isCreating={isCreating}
                    selectedStaff={selectedStaff}
                    isSaving={isSaving}
                    error={error}
                    permissionPreview={permissionPreview}
                    onSave={() => void saveStaff()}
                    onDiscard={closeEditor}
                    onToggleActive={() =>
                        setDraft((current) => ({
                            ...current,
                            isActive: !current.isActive,
                        }))
                    }
                />
            </Drawer>

            <Modal
                size="sm"
                isOpen={Boolean(staffToDisable)}
                onOpenChange={(open) => {
                    if (!open && !isSaving) setStaffToDisable(null);
                }}
                isDismissable={!isSaving}
            >
                <ModalHeader
                    title={t('ownerStaff.disableTitle')}
                    description={t('ownerStaff.disableMessage')}
                />
                <ModalBody>
                    <div className="border-separator-border bg-background-secondary-default rounded-xl border p-3">
                        <p className="text-body-semibold text-text-primary">
                            {staffToDisable?.name}
                        </p>
                        <p className="text-caption-1-regular text-text-secondary">
                            {staffToDisable?.email} ·{' '}
                            {staffToDisable?.roleLabel}
                        </p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="secondary"
                        disabled={isSaving}
                        onClick={() => setStaffToDisable(null)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="danger"
                        disabled={isSaving}
                        onClick={() => void confirmDisableStaff()}
                    >
                        {isSaving
                            ? t('common.saving')
                            : t('ownerStaff.disableConfirm')}
                    </Button>
                </ModalFooter>
            </Modal>

            {error && !isEditorOpen && (
                <div
                    className={cx('staff-finance-error', 'text-body-2-regular')}
                    role="alert"
                >
                    {error}
                    <Button
                        size="small"
                        variant="ghost"
                        onClick={() => setError('')}
                    >
                        {t('common.close')}
                    </Button>
                </div>
            )}
        </section>
    );
}

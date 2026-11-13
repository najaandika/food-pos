import { useMemo, useState } from 'react';
import {
    RiGroupLine,
    RiShieldUserLine,
    RiAddLine,
    RiUserFollowLine,
    RiUserUnfollowLine,
} from '@remixicon/react';
import { StatCards } from '../../../../../../components/application/dashboard/stat-cards';
import { Button } from '../../../../../../components/base/buttons/button';
import { Drawer } from '../../../../../../components/base/drawer/drawer';
import {
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
} from '../../../../../../components/base/modal/modal';
import { cx } from '../../../../../../utils/cx';
import { AdminTitle } from '../..';
import { useLocale } from '../../i18n-context';
import type { AdminStaff } from '../../runtime-data';
import { OwnerStaffForm, type StaffDraft } from './OwnerStaffForm';
import {
    blankStaff,
    draftFromStaff,
    filterStaffMembers,
    paginateStaffMembers,
    payloadFromDraft,
    type StaffFormPayload,
    type StaffRoleFilter,
    type StaffStatusFilter,
} from './owner-staff-model';
import { OwnerStaffList } from './OwnerStaffList';

export function OwnerStaffView({
    staff = [],
    persisted = false,
    onCreateStaff,
    onUpdateStaff,
    onDisableStaff,
}: {
    staff?: AdminStaff[];
    persisted?: boolean;
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

    const filteredStaff = useMemo(
        () => filterStaffMembers(staff, roleFilter, statusFilter, query),
        [staff, roleFilter, statusFilter, query],
    );

    const { totalPages, currentPage, visibleStaff } = paginateStaffMembers(
        filteredStaff,
        page,
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
        if (
            (isCreating && !payload.password) ||
            (payload.password && payload.password.length < 8)
        ) {
            setError(
                isId
                    ? 'Masukkan password minimal 8 karakter untuk akun staf.'
                    : 'Enter a staff password of at least 8 characters.',
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
                {persisted
                    ? isId
                        ? 'Data dan perubahan akun staf tersimpan di Laravel.'
                        : 'Staff accounts and changes are saved in Laravel.'
                    : isId
                      ? 'Data staf belum terhubung ke penyimpanan permanen.'
                      : 'Staff data is not connected to permanent storage.'}
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
                    persisted={persisted}
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

import {
    RiCheckLine,
    RiLockPasswordLine,
    RiShieldCheckLine,
} from '@remixicon/react';
import { Avatar } from '../../../../../../components/base/avatar/avatar';
import { Chip } from '../../../../../../components/base/badges/chip';
import { Button } from '../../../../../../components/base/buttons/button';
import {
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
} from '../../../../../../components/base/drawer/drawer';
import { Input } from '../../../../../../components/base/input/input';
import {
    Select,
    SelectItem,
} from '../../../../../../components/base/select/select';
import { useLocale } from '../../i18n-context';
import type { AdminStaff } from '../../runtime-data';

type StaffRole = 'owner' | 'kasir' | 'waiters';

type StaffDraft = {
    name: string;
    email: string;
    role: StaffRole;
    password: string;
    isActive: boolean;
};

type Props = {
    draft: StaffDraft;
    onChangeDraft: (updater: (current: StaffDraft) => StaffDraft) => void;
    isCreating: boolean;
    selectedStaff: AdminStaff | undefined;
    isSaving: boolean;
    error?: string;
    permissionPreview: string[];
    onSave: () => void;
    onDiscard: () => void;
    onToggleActive: () => void;
};

export function OwnerStaffForm({
    draft,
    onChangeDraft,
    isCreating,
    selectedStaff,
    isSaving,
    error,
    permissionPreview,
    onSave,
    onDiscard,
    onToggleActive,
}: Props) {
    const { t, locale } = useLocale();
    const isId = locale === 'id';

    return (
        <>
            <DrawerHeader
                closeLabel={t('common.close')}
                title={
                    isCreating
                        ? t('ownerStaff.addStaff')
                        : t('ownerStaff.editStaff')
                }
                description={
                    isCreating
                        ? t('ownerStaff.createAccount')
                        : t('ownerStaff.updateRole')
                }
            />
            <DrawerBody className="staff-finance-editor-body">
                <div className="staff-finance-drawer-profile">
                    <Avatar
                        size="lg"
                        color={draft.role === 'owner' ? 'blue' : 'neutral'}
                        initials={
                            draft.name
                                .trim()
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((word) => word[0] ?? '')
                                .join('')
                                .toUpperCase() || 'S'
                        }
                    />
                    <div className="staff-finance-profile-info">
                        <p className="text-body-semibold text-text-primary">
                            {draft.name ||
                                (isId ? 'Akun staf baru' : 'New staff account')}
                        </p>
                        <p className="text-caption-1-regular text-text-secondary">
                            {selectedStaff?.email && !isCreating
                                ? selectedStaff.email
                                : isId
                                  ? 'Atur informasi dan izin akses'
                                  : 'Configure account information and access'}
                        </p>
                    </div>
                    <Chip
                        variant="caption"
                        color={draft.isActive ? 'lime' : 'rose'}
                    >
                        {draft.isActive
                            ? t('common.active')
                            : t('common.inactive')}
                    </Chip>
                </div>

                <div className="staff-finance-drawer-fields">
                    <Input
                        label={t('ownerStaff.fullName')}
                        fieldClassName="staff-finance-focus-field"
                        autoFocus
                        isRequired
                        value={draft.name}
                        onChange={(value) =>
                            onChangeDraft((current) => ({
                                ...current,
                                name: value,
                            }))
                        }
                        autoComplete="name"
                        isDisabled={isSaving}
                    />
                    <Input
                        label={t('ownerStaff.email')}
                        fieldClassName="staff-finance-focus-field"
                        type="email"
                        isRequired
                        value={draft.email}
                        onChange={(value) =>
                            onChangeDraft((current) => ({
                                ...current,
                                email: value,
                            }))
                        }
                        autoComplete="email"
                        isDisabled={isSaving}
                    />
                    <Select
                        label={t('ownerStaff.role')}
                        className="staff-finance-role-select"
                        triggerClassName="staff-finance-focus-select"
                        selectedKey={draft.role}
                        isDisabled={isSaving}
                        onSelectionChange={(key) =>
                            onChangeDraft((current) => ({
                                ...current,
                                role: String(key) as StaffRole,
                            }))
                        }
                    >
                        <SelectItem id="owner">Owner</SelectItem>
                        <SelectItem id="kasir">Kasir</SelectItem>
                        <SelectItem id="waiters">Waiters</SelectItem>
                    </Select>
                    <Input
                        label={
                            isCreating
                                ? t('ownerStaff.password')
                                : t('ownerStaff.newPassword')
                        }
                        type="password"
                        leadingIcon={RiLockPasswordLine}
                        fieldClassName="staff-finance-focus-field"
                        autoComplete={isCreating ? 'new-password' : 'off'}
                        value={draft.password}
                        onChange={(value) =>
                            onChangeDraft((current) => ({
                                ...current,
                                password: value,
                            }))
                        }
                        placeholder={
                            isCreating
                                ? t('ownerStaff.minChars')
                                : t('ownerStaff.keepCurrent')
                        }
                        isDisabled={isSaving}
                        hint={
                            isId
                                ? 'Perubahan password belum tersimpan permanen pada mode sesi.'
                                : 'Password changes are not permanently saved in session mode.'
                        }
                    />
                </div>

                <div className="staff-finance-access-control">
                    <div className="staff-finance-access-copy">
                        <p className="text-body-semibold text-text-primary">
                            {isId
                                ? 'Status akses akun'
                                : 'Account access status'}
                        </p>
                        <p className="text-caption-1-regular text-text-secondary">
                            {isId
                                ? 'Akun nonaktif tidak dapat digunakan untuk masuk saat aturan backend diterapkan.'
                                : 'Inactive accounts cannot sign in once backend access rules are applied.'}
                        </p>
                    </div>
                    <Button
                        size="small"
                        variant="secondary"
                        disabled={isSaving}
                        onClick={onToggleActive}
                    >
                        {draft.isActive
                            ? isId
                                ? 'Nonaktifkan'
                                : 'Deactivate'
                            : isId
                              ? 'Aktifkan'
                              : 'Activate'}
                    </Button>
                </div>

                <section className="staff-finance-permission-preview">
                    <div className="staff-finance-permission-heading">
                        <RiShieldCheckLine
                            className="text-foreground-icon-secondary size-5"
                            aria-hidden="true"
                        />
                        <h3 className="text-body-semibold text-text-primary">
                            {t('ownerStaff.permissionPreview')}
                        </h3>
                    </div>
                    <ul>
                        {permissionPreview.map((permission) => (
                            <li
                                key={permission}
                                className="text-body-2-regular text-text-secondary"
                            >
                                <RiCheckLine
                                    className="text-status-lime-text size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                {permission}
                            </li>
                        ))}
                    </ul>
                </section>

                {error && (
                    <div
                        className="staff-finance-form-error text-body-2-regular"
                        role="alert"
                    >
                        {error}
                    </div>
                )}
            </DrawerBody>
            <DrawerFooter className="staff-finance-drawer-footer">
                <Button
                    variant="secondary"
                    disabled={isSaving}
                    onClick={onDiscard}
                >
                    {t('common.cancel')}
                </Button>
                <Button variant="primary" disabled={isSaving} onClick={onSave}>
                    {isSaving ? t('common.saving') : t('ownerStaff.saveStaff')}
                </Button>
            </DrawerFooter>
        </>
    );
}

export type { StaffDraft, StaffRole };

'use client';

import { ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { MockSelect } from '../..';
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

const roleOptions = ['owner', 'kasir', 'waiters'];

type Props = {
  draft: StaffDraft;
  onChangeDraft: (updater: (current: StaffDraft) => StaffDraft) => void;
  isCreating: boolean;
  selectedStaff: AdminStaff | undefined;
  isSaving: boolean;
  permissionPreview: string[];
  onSave: () => void;
  onDiscard: () => void;
  onToggleActive: () => void;
};

export function OwnerStaffForm({ draft, onChangeDraft, isCreating, selectedStaff, isSaving, permissionPreview, onSave, onDiscard, onToggleActive }: Props) {
  const { t } = useLocale();
  return (
    <aside className="staff-editor-panel">
      <div className="staff-panel-top">
        <span className="mini-status ready">{isCreating ? t('ownerStaff.newAccess') : t('ownerStaff.editingAccess')}</span>
        <button className={draft.isActive ? 'is-active' : 'is-inactive'} type="button" onClick={onToggleActive}>
          {draft.isActive ? t('common.active') : t('common.inactive')}
        </button>
      </div>
      <div className="staff-editor-head">
        <span className="staff-avatar-large">
          {selectedStaff?.avatar && !isCreating ? <Image src={selectedStaff.avatar} alt={selectedStaff.name} width={96} height={96} /> : <ShieldCheck aria-hidden="true" />}
        </span>
        <h2>{isCreating ? t('ownerStaff.addStaff') : draft.name || t('ownerStaff.editStaff')}</h2>
        <p>{isCreating ? t('ownerStaff.createAccount') : t('ownerStaff.updateRole')}</p>
      </div>
      <div className="editor-fields">
        <label>
          <span>{t('ownerStaff.fullName')}</span>
          <input autoComplete="name" value={draft.name} onChange={(event) => onChangeDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          <span>{t('ownerStaff.email')}</span>
          <input type="email" autoComplete="email" value={draft.email} onChange={(event) => onChangeDraft((current) => ({ ...current, email: event.target.value }))} />
        </label>
        <div className="editor-field">
          <span>{t('ownerStaff.role')}</span>
          <MockSelect value={draft.role} options={roleOptions} onChange={(role) => onChangeDraft((current) => ({ ...current, role: role as StaffRole }))} />
        </div>
        <label>
          <span>{isCreating ? t('ownerStaff.password') : t('ownerStaff.newPassword')}</span>
          <input
            type="password"
            autoComplete={isCreating ? 'new-password' : 'off'}
            placeholder={isCreating ? t('ownerStaff.minChars') : t('ownerStaff.keepCurrent')}
            value={draft.password}
            onChange={(event) => onChangeDraft((current) => ({ ...current, password: event.target.value }))}
          />
        </label>
      </div>
      <div className="permission-card">
        <h3>{t('ownerStaff.permissionPreview')}</h3>
        <div className="permission-list">
          {permissionPreview.map((permission) => (
            <p key={permission}>
              <span />
              {permission}
            </p>
          ))}
        </div>
      </div>
      <div className="editor-actions">
        <button type="button" onClick={onDiscard}>
          {t('common.cancel')}
        </button>
        <button type="button" disabled={isSaving} onClick={() => void onSave()}>
          {isSaving ? t('common.saving') : t('ownerStaff.saveStaff')}
        </button>
      </div>
    </aside>
  );
}

export type { StaffDraft, StaffRole };

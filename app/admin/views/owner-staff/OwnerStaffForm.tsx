'use client';

import { ShieldCheck } from 'lucide-react';
import { MockSelect } from '../..';
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
  return (
    <aside className="staff-editor-panel">
      <div className="staff-panel-top">
        <span className="mini-status ready">{isCreating ? 'New Access' : 'Editing Access'}</span>
        <button type="button" onClick={onToggleActive}>
          {draft.isActive ? 'Active' : 'Inactive'}
        </button>
      </div>
      <div className="staff-editor-head">
        <span className="staff-avatar-large">
          {selectedStaff?.avatar && !isCreating ? <img src={selectedStaff.avatar} alt={selectedStaff.name} /> : <ShieldCheck aria-hidden="true" />}
        </span>
        <h2>{isCreating ? 'Add Staff' : draft.name || 'Edit Staff'}</h2>
        <p>{isCreating ? 'Create internal account access for the team.' : 'Update role, login access, and profile details.'}</p>
      </div>
      <div className="editor-fields">
        <label>
          <span>Full Name</span>
          <input value={draft.name} onChange={(event) => onChangeDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          <span>Email</span>
          <input value={draft.email} onChange={(event) => onChangeDraft((current) => ({ ...current, email: event.target.value }))} />
        </label>
        <div className="editor-field">
          <span>Role</span>
          <MockSelect value={draft.role} options={roleOptions} onChange={(role) => onChangeDraft((current) => ({ ...current, role: role as StaffRole }))} />
        </div>
        <label>
          <span>{isCreating ? 'Password' : 'New Password'}</span>
          <input
            type="password"
            placeholder={isCreating ? 'Minimum 6 characters' : 'Leave empty to keep current'}
            value={draft.password}
            onChange={(event) => onChangeDraft((current) => ({ ...current, password: event.target.value }))}
          />
        </label>
      </div>
      <div className="permission-card">
        <h3>Permission Preview</h3>
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
          Cancel
        </button>
        <button type="button" disabled={isSaving} onClick={() => void onSave()}>
          {isSaving ? 'Saving...' : 'Save Staff'}
        </button>
      </div>
    </aside>
  );
}

export type { StaffDraft, StaffRole };

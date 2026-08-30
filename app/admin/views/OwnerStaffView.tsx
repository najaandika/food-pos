'use client';

import './OwnerStaffView.css';

import { useEffect, useMemo, useState } from 'react';

import { AdminTitle } from '..';
import type { AdminStaff } from '../runtime-data';
import { OwnerStaffForm, type StaffDraft } from './owner-staff/OwnerStaffForm';
import { OwnerStaffList } from './owner-staff/OwnerStaffList';

type StaffRole = 'owner' | 'kasir' | 'waiters';

type StaffFormPayload = {
  name: string;
  email: string;
  role: StaffRole;
  password?: string;
  isActive: boolean;
};

const fallbackStaff: AdminStaff[] = [
  {
    name: 'Owner Bloc Barat',
    role: 'owner',
    roleLabel: 'Owner',
    status: 'Active',
    isActive: true,
    shift: 'All access',
    activity: 'Today, 18:40',
    email: 'owner@blocbarat.local',
    area: 'Full access',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80',
  },
  {
    name: 'Gladina Samantha',
    role: 'waiters',
    roleLabel: 'Waiters',
    status: 'Active',
    isActive: true,
    shift: 'Evening',
    activity: 'Today, 18:32',
    email: 'waiters@blocbarat.local',
    area: 'Floor service',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
  },
];

const emptyDraft: StaffDraft = { name: '', email: '', role: 'waiters', password: '', isActive: true };

function draftFromStaff(person?: AdminStaff): StaffDraft {
  if (!person) return emptyDraft;
  return { name: person.name, email: person.email, role: person.role, password: '', isActive: person.isActive };
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

export function OwnerStaffView({
  staff,
  onCreateStaff,
  onUpdateStaff,
  onDisableStaff,
}: {
  staff?: AdminStaff[];
  onCreateStaff?: (payload: StaffFormPayload) => Promise<void> | void;
  onUpdateStaff?: (staffId: number | undefined, payload: StaffFormPayload) => Promise<void> | void;
  onDisableStaff?: (staffId: number | undefined) => Promise<void> | void;
}) {
  const cafeStaff = staff?.length ? staff : fallbackStaff;
  const [activeFilter, setActiveFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(cafeStaff[0]?.id);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<StaffDraft>(() => draftFromStaff(cafeStaff[0]));
  const [isSaving, setIsSaving] = useState(false);

  const selectedStaff = useMemo(() => cafeStaff.find((person) => person.id === selectedId) ?? cafeStaff[0], [cafeStaff, selectedId]);

  useEffect(() => {
    if (isCreating) return;
    const nextStaff = cafeStaff.find((person) => person.id === selectedId) ?? cafeStaff[0];
    setSelectedId(nextStaff?.id);
    setDraft(draftFromStaff(nextStaff));
  }, [cafeStaff, selectedId, isCreating]);

  const filteredStaff = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return cafeStaff.filter((person) => {
      const matchesFilter = activeFilter === 'All' || person.roleLabel === activeFilter;
      const matchesQuery =
        !normalizedQuery ||
        person.name.toLowerCase().includes(normalizedQuery) ||
        person.email.toLowerCase().includes(normalizedQuery) ||
        person.roleLabel.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, cafeStaff, query]);

  const staffStats = useMemo(
    () => [
      { label: 'Total Staff', value: String(cafeStaff.length), hint: '3 roles configured' },
      { label: 'On Shift', value: String(cafeStaff.filter((person) => person.isActive).length), hint: 'Active access' },
      { label: 'Inactive', value: String(cafeStaff.filter((person) => !person.isActive).length), hint: 'Access disabled' },
    ],
    [cafeStaff],
  );

  const permissionPreview = useMemo(() => {
    if (draft.role === 'owner') return ['Full dashboard access', 'Manage menu and tables', 'View reports', 'Manage staff access'];
    if (draft.role === 'kasir') return ['Open cashier desk', 'Close payment queue', 'Print bills', 'View active tickets'];
    return ['View table status', 'Confirm customer calls', 'Update service progress', 'Mark order as served'];
  }, [draft.role]);

  const startCreate = () => {
    setIsCreating(true);
    setSelectedId(undefined);
    setDraft(emptyDraft);
  };

  const startEdit = (person: AdminStaff) => {
    setIsCreating(false);
    setSelectedId(person.id);
    setDraft(draftFromStaff(person));
  };

  const saveStaff = async () => {
    const payload = payloadFromDraft(draft);
    if (!payload.name || !payload.email.includes('@')) return;
    setIsSaving(true);
    try {
      if (isCreating) {
        await onCreateStaff?.(payload);
        setIsCreating(false);
      } else {
        await onUpdateStaff?.(selectedStaff?.id, payload);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const disableStaff = async (person = selectedStaff) => {
    if (!person?.id) return;
    const approved = window.confirm(`Disable access for ${person.name}?`);
    if (!approved) return;
    await onDisableStaff?.(person.id);
  };

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Staff Management" subtitle="Control staff access, role permissions, and shift status." />
        <button className="owner-primary-btn" type="button" onClick={startCreate}>
          Invite Staff
        </button>
      </header>

      <div className="staff-layout">
        <OwnerStaffList
          staff={cafeStaff}
          filteredStaff={filteredStaff}
          staffStats={staffStats}
          activeFilter={activeFilter}
          query={query}
          selectedId={selectedId}
          isCreating={isCreating}
          selectedStaff={selectedStaff}
          onChangeFilter={setActiveFilter}
          onChangeQuery={setQuery}
          onStartEdit={startEdit}
          onDisable={disableStaff}
        />
        <OwnerStaffForm
          draft={draft}
          onChangeDraft={setDraft}
          isCreating={isCreating}
          selectedStaff={selectedStaff}
          isSaving={isSaving}
          permissionPreview={permissionPreview}
          onSave={saveStaff}
          onDiscard={() => (isCreating ? setDraft(emptyDraft) : setDraft(draftFromStaff(selectedStaff)))}
          onToggleActive={() => setDraft((current) => ({ ...current, isActive: !current.isActive }))}
        />
      </div>
    </section>
  );
}

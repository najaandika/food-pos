'use client';

import { useEffect, useMemo, useState } from 'react';

import { AdminTitle } from '..';
import { ConfirmModal } from '../ConfirmModal';
import { useLocale } from '../i18n-context';
import type { AdminStaff } from '../runtime-data';
import { OwnerStaffForm, type StaffDraft } from './owner-staff/OwnerStaffForm';
import { OwnerStaffList } from './owner-staff/OwnerStaffList';

type StaffRole = 'owner' | 'kasir' | 'waiters';
type StaffFilter = 'all' | StaffRole | 'inactive';

type StaffFormPayload = {
  name: string;
  email: string;
  role: StaffRole;
  password?: string;
  isActive: boolean;
};

const fallbackStaff: AdminStaff[] = [
  {
    name: 'POS Owner',
    role: 'owner',
    roleLabel: 'Owner',
    status: 'Active',
    isActive: true,
    shift: 'All access',
    activity: 'Today, 18:40',
    email: 'owner@pos.local',
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
    email: 'waiters@pos.local',
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
  const { t } = useLocale();
  const posStaff = staff ?? fallbackStaff;
  const [activeFilter, setActiveFilter] = useState<StaffFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(posStaff[0]?.id);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<StaffDraft>(() => draftFromStaff(posStaff[0]));
  const [isSaving, setIsSaving] = useState(false);
  const [staffToDisable, setStaffToDisable] = useState<AdminStaff | null>(null);

  const selectedStaff = useMemo(() => posStaff.find((person) => person.id === selectedId) ?? posStaff[0], [posStaff, selectedId]);

  useEffect(() => {
    if (isCreating) return;
    const nextStaff = posStaff.find((person) => person.id === selectedId) ?? posStaff[0];
    setSelectedId(nextStaff?.id);
    setDraft(draftFromStaff(nextStaff));
  }, [posStaff, selectedId, isCreating]);

  const filteredStaff = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return posStaff.filter((person) => {
      const matchesFilter = activeFilter === 'all' || person.role === activeFilter || (activeFilter === 'inactive' && !person.isActive);
      const matchesQuery =
        !normalizedQuery ||
        person.name.toLowerCase().includes(normalizedQuery) ||
        person.email.toLowerCase().includes(normalizedQuery) ||
        person.roleLabel.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, posStaff, query]);

  const staffStats = useMemo(
    () => [
      { label: t('ownerStaff.totalStaff'), value: String(posStaff.length), hint: `3 ${t('ownerStaff.rolesConfigured')}` },
      { label: t('ownerStaff.onShift'), value: String(posStaff.filter((person) => person.isActive).length), hint: t('ownerStaff.activeAccess') },
      { label: t('ownerStaff.inactiveStaff'), value: String(posStaff.filter((person) => !person.isActive).length), hint: t('ownerStaff.accessDisabled') },
    ],
    [posStaff, t],
  );

  const permissionPreview = useMemo(() => {
    if (draft.role === 'owner') return [t('perm.fullDashboard'), t('perm.manageMenuTables'), t('perm.viewReports'), t('perm.manageStaff')];
    if (draft.role === 'kasir') return [t('perm.openCashier'), t('perm.closePayment'), t('perm.printBills'), t('perm.viewTickets')];
    return [t('perm.viewTable'), t('perm.confirmCalls'), t('perm.updateProgress'), t('perm.markServed')];
  }, [draft.role, t]);

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

  const clearFilters = () => {
    setActiveFilter('all');
    setQuery('');
  };

  const discardStaffDraft = () => {
    if (isCreating) {
      const firstStaff = posStaff[0];
      setIsCreating(false);
      setSelectedId(firstStaff?.id);
      setDraft(draftFromStaff(firstStaff));
      return;
    }
    setDraft(draftFromStaff(selectedStaff));
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

  const disableStaff = (person = selectedStaff) => {
    if (!person?.id) return;
    setStaffToDisable(person);
  };

  const confirmDisableStaff = async () => {
    if (!staffToDisable?.id) return;
    const personId = staffToDisable.id;
    setStaffToDisable(null);
    await onDisableStaff?.(personId);
  };

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title={t('ownerStaff.title')} subtitle={t('ownerStaff.subtitle')} />
        <button className="owner-primary-btn" type="button" onClick={startCreate}>
          {t('ownerStaff.inviteStaff')}
        </button>
      </header>

      <div className="staff-layout">
        <OwnerStaffList
          staff={posStaff}
          filteredStaff={filteredStaff}
          staffStats={staffStats}
          activeFilter={activeFilter}
          query={query}
          selectedId={selectedId}
          isCreating={isCreating}
          selectedStaff={selectedStaff}
          onChangeFilter={setActiveFilter}
          onChangeQuery={setQuery}
          onClearFilters={clearFilters}
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
          onDiscard={discardStaffDraft}
          onToggleActive={() => setDraft((current) => ({ ...current, isActive: !current.isActive }))}
        />
      </div>

      <ConfirmModal
        isOpen={Boolean(staffToDisable)}
        title={t('ownerStaff.disableTitle')}
        message={t('ownerStaff.disableMessage')}
        targetName={staffToDisable?.name}
        targetDetails={staffToDisable ? `${staffToDisable.email} • ${staffToDisable.roleLabel}` : undefined}
        confirmLabel={t('ownerStaff.disableConfirm')}
        cancelLabel={t('common.cancel')}
        isDanger={true}
        onConfirm={confirmDisableStaff}
        onCancel={() => setStaffToDisable(null)}
      />
    </section>
  );
}

'use client';

import { Pencil, Search, ShieldCheck, UserX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AdminTitle, MockSelect } from '..';
import type { AdminStaff } from '../runtime-data';

type StaffRole = 'owner' | 'kasir' | 'waiters';

type StaffFormPayload = {
  name: string;
  email: string;
  role: StaffRole;
  password?: string;
  isActive: boolean;
};

type StaffDraft = {
  name: string;
  email: string;
  role: StaffRole;
  password: string;
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

const roleOptions = ['owner', 'kasir', 'waiters'];
const roleLabels: Record<StaffRole, string> = {
  owner: 'Owner',
  kasir: 'Kasir',
  waiters: 'Waiters',
};

const emptyDraft: StaffDraft = {
  name: '',
  email: '',
  role: 'waiters',
  password: '',
  isActive: true,
};

function draftFromStaff(person?: AdminStaff): StaffDraft {
  if (!person) return emptyDraft;

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

  const selectedStaff = useMemo(
    () => cafeStaff.find((person) => person.id === selectedId) ?? cafeStaff[0],
    [cafeStaff, selectedId],
  );

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
        <button className="owner-primary-btn" type="button" onClick={startCreate}>Invite Staff</button>
      </header>

      <div className="staff-layout">
        <section className="staff-main">
          <div className="staff-summary">
            {staffStats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.hint}</small>
              </article>
            ))}
          </div>

          <div className="staff-panel">
            <div className="table-tools">
              <label className="search-wrap">
                <input type="search" placeholder="Search staff name or role" value={query} onChange={(event) => setQuery(event.target.value)} />
                <Search aria-hidden="true" />
              </label>
              <div className="owner-filter-tabs">
                {['All', 'Owner', 'Kasir', 'Waiters'].map((filter) => (
                  <button className={activeFilter === filter ? 'active' : ''} type="button" key={filter} onClick={() => setActiveFilter(filter)}>
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="staff-list">
              {filteredStaff.map((person) => (
                <article className={`staff-row ${person.id === selectedStaff?.id && !isCreating ? 'selected' : ''}`} key={person.id ?? person.email}>
                  <button className="staff-person" type="button" onClick={() => startEdit(person)}>
                    <span><img src={person.avatar} alt={person.name} /></span>
                    <div><strong>{person.name}</strong><small>{person.email}</small><em>{person.activity}</em></div>
                  </button>
                  <span className={`staff-role ${person.role}`}>{person.roleLabel}</span>
                  <span className="staff-shift"><strong>{person.shift}</strong><small>{person.area}</small></span>
                  <b className={person.isActive ? 'active' : 'inactive'}>{person.status}</b>
                  <div className="staff-actions">
                    <button type="button" aria-label={`Edit ${person.name}`} onClick={() => startEdit(person)}><Pencil aria-hidden="true" /></button>
                    <button type="button" aria-label={`Disable ${person.name}`} onClick={() => void disableStaff(person)}><UserX aria-hidden="true" /></button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="staff-editor-panel">
          <div className="staff-panel-top">
            <span className="mini-status ready">{isCreating ? 'New Access' : 'Editing Access'}</span>
            <button type="button" onClick={() => setDraft((current) => ({ ...current, isActive: !current.isActive }))}>
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
              <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Email</span>
              <input value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <div className="editor-field">
              <span>Role</span>
              <MockSelect value={draft.role} options={roleOptions} onChange={(role) => setDraft((current) => ({ ...current, role: role as StaffRole }))} />
            </div>
            <label>
              <span>{isCreating ? 'Password' : 'New Password'}</span>
              <input
                type="password"
                placeholder={isCreating ? 'Minimum 6 characters' : 'Leave empty to keep current'}
                value={draft.password}
                onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
          </div>
          <div className="permission-card">
            <h3>Permission Preview</h3>
            <div className="permission-list">
              {permissionPreview.map((permission) => (
                <p key={permission}><span />{permission}</p>
              ))}
            </div>
          </div>
          <div className="editor-actions">
            <button type="button" onClick={() => (isCreating ? setDraft(emptyDraft) : setDraft(draftFromStaff(selectedStaff)))}>Cancel</button>
            <button type="button" disabled={isSaving} onClick={() => void saveStaff()}>{isSaving ? 'Saving...' : 'Save Staff'}</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

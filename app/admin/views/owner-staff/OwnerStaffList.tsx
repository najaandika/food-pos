'use client';

import { Pencil, Search, UserX } from 'lucide-react';
import Image from 'next/image';
import { useLocale } from '../../i18n-context';
import type { AdminStaff } from '../../runtime-data';

type Props = {
  staff: AdminStaff[];
  filteredStaff: AdminStaff[];
  staffStats: Array<{ label: string; value: string; hint: string }>;
  activeFilter: 'all' | 'owner' | 'kasir' | 'waiters' | 'inactive';
  query: string;
  selectedId: number | undefined;
  isCreating: boolean;
  selectedStaff: AdminStaff | undefined;
  onChangeFilter: (filter: 'all' | 'owner' | 'kasir' | 'waiters' | 'inactive') => void;
  onChangeQuery: (query: string) => void;
  onClearFilters: () => void;
  onStartEdit: (person: AdminStaff) => void;
  onDisable: (person: AdminStaff) => void;
};

export function OwnerStaffList({
  filteredStaff,
  staffStats,
  activeFilter,
  query,
  selectedId,
  isCreating,
  selectedStaff,
  onChangeFilter,
  onChangeQuery,
  onClearFilters,
  onStartEdit,
  onDisable,
}: Props) {
  const { t } = useLocale();
  return (
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
          <label className="admin-search-wrap">
            <input type="search" placeholder={t('ownerStaff.searchStaff')} value={query} onChange={(event) => onChangeQuery(event.target.value)} />
            <Search aria-hidden="true" />
          </label>
          <div className="owner-filter-tabs">
            {[
              ['all', t('common.all')],
              ['owner', 'Owner'],
              ['kasir', 'Kasir'],
              ['waiters', 'Waiters'],
              ['inactive', t('common.inactive')],
            ].map(([filter, label]) => (
              <button className={activeFilter === filter ? 'active' : ''} type="button" key={filter} onClick={() => onChangeFilter(filter as 'all' | 'owner' | 'kasir' | 'waiters' | 'inactive')}>
                {label}
              </button>
            ))}
          </div>
          <p className="staff-result-count">{filteredStaff.length} {t('ownerStaff.members')}</p>
        </div>

        <div className="staff-list">
          {filteredStaff.map((person) => (
            <article className={`staff-row ${person.id === selectedStaff?.id && !isCreating ? 'selected' : ''}`} key={person.id ?? person.email}>
              <button className="staff-person" type="button" onClick={() => onStartEdit(person)}>
                <span>
                  <Image src={person.avatar} alt={person.name} width={56} height={56} />
                </span>
                <div>
                  <strong>{person.name}</strong>
                  <small>{person.email}</small>
                  <em>{person.activity}</em>
                </div>
              </button>
              <span className={`staff-role ${person.role}`}>{person.roleLabel}</span>
              <span className="staff-shift">
                <strong>{person.shift}</strong>
                <small>{person.area}</small>
              </span>
              <b className={person.isActive ? 'active' : 'inactive'}>{person.status}</b>
              <div className="staff-actions">
                <button type="button" aria-label={`${t('ownerStaff.editStaff')} ${person.name}`} onClick={() => onStartEdit(person)}>
                  <Pencil aria-hidden="true" />
                </button>
                {person.isActive && (
                  <button type="button" aria-label={`${t('ownerStaff.disableTitle')} ${person.name}`} onClick={() => void onDisable(person)}>
                    <UserX aria-hidden="true" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {filteredStaff.length === 0 && (
          <div className="staff-empty-state">
            <strong>{t('ownerStaff.noStaffFound')}</strong>
            <p>{t('ownerStaff.noStaffFoundHint')}</p>
            <button type="button" onClick={onClearFilters}>{t('ownerStaff.resetFilters')}</button>
          </div>
        )}
      </div>
    </section>
  );
}

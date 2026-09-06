'use client';

import { Pencil, Search, UserX } from 'lucide-react';
import Image from 'next/image';
import type { AdminStaff } from '../../runtime-data';

type Props = {
  staff: AdminStaff[];
  filteredStaff: AdminStaff[];
  staffStats: Array<{ label: string; value: string; hint: string }>;
  activeFilter: string;
  query: string;
  selectedId: number | undefined;
  isCreating: boolean;
  selectedStaff: AdminStaff | undefined;
  onChangeFilter: (filter: string) => void;
  onChangeQuery: (query: string) => void;
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
  onStartEdit,
  onDisable,
}: Props) {
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
            <input type="search" placeholder="Search staff name or role" value={query} onChange={(event) => onChangeQuery(event.target.value)} />
            <Search aria-hidden="true" />
          </label>
          <div className="owner-filter-tabs">
            {['All', 'Owner', 'Kasir', 'Waiters'].map((filter) => (
              <button className={activeFilter === filter ? 'active' : ''} type="button" key={filter} onClick={() => onChangeFilter(filter)}>
                {filter}
              </button>
            ))}
          </div>
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
                <button type="button" aria-label={`Edit ${person.name}`} onClick={() => onStartEdit(person)}>
                  <Pencil aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Disable ${person.name}`} onClick={() => void onDisable(person)}>
                  <UserX aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

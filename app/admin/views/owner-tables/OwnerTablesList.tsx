'use client';

import { Copy, Printer, Search } from 'lucide-react';
import type { AdminTable } from '../../runtime-data';

type Props = {
  tables: AdminTable[];
  filteredTables: AdminTable[];
  tableStats: Array<{ label: string; value: string; hint: string }>;
  activeFilter: string;
  query: string;
  selectedId: number | undefined;
  isCreating: boolean;
  selectedTable: AdminTable | undefined;
  onChangeFilter: (filter: string) => void;
  onChangeQuery: (query: string) => void;
  onStartEdit: (table: AdminTable) => void;
};

export function OwnerTablesList({ filteredTables, tableStats, activeFilter, query, selectedId, isCreating, selectedTable, onChangeFilter, onChangeQuery, onStartEdit }: Props) {
  return (
    <section className="tables-main">
      <div className="tables-summary">
        {tableStats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.hint}</small>
          </article>
        ))}
      </div>

      <div className="table-tools">
        <label className="search-wrap">
          <input type="search" placeholder="Search table code or area" value={query} onChange={(event) => onChangeQuery(event.target.value)} />
          <Search aria-hidden="true" />
        </label>
        <div className="owner-filter-tabs">
          {['All', 'Indoor', 'Outdoor', 'Inactive'].map((filter) => (
            <button className={activeFilter === filter ? 'active' : ''} type="button" key={filter} onClick={() => onChangeFilter(filter)}>
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="qr-table-grid">
        {filteredTables.map((table) => (
          <article className={`qr-table-card ${table.tone} ${table.id === selectedTable?.id && !isCreating ? 'selected' : ''}`} key={table.id ?? table.code}>
            <button className="qr-card-top" type="button" onClick={() => onStartEdit(table)}>
              <span className={`table-pill ${table.tone === 'inactive' ? 'gold' : 'teal'}`}>{table.code}</span>
              <div>
                <strong>{table.name}</strong>
                <small>
                  {table.area} - {table.seats} seats
                </small>
              </div>
            </button>
            <div className="qr-card-body">
              <div className="qr-preview" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div>
                <span className={`table-state ${table.status.toLowerCase().replaceAll(' ', '-')}`}>{table.status}</span>
                <p>{table.lastOrder}</p>
                <small>{table.scans} scans today</small>
              </div>
            </div>
            <div className="qr-card-bottom">
              <a href={`/table/${table.code}`}>/table/{table.code}</a>
              <div>
                <button className="qr-icon-action" type="button" aria-label={`Print QR for table ${table.code}`}>
                  <Printer aria-hidden="true" />
                </button>
                <button className="qr-icon-action" type="button" aria-label={`Edit table ${table.code}`} onClick={() => onStartEdit(table)}>
                  <Copy aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

'use client';

import { Check, Copy, Pencil, Printer, Search } from 'lucide-react';
import { useLocale } from '../../i18n-context';
import type { AdminTable } from '../../runtime-data';

type Props = {
  tables: AdminTable[];
  filteredTables: AdminTable[];
  tableStats: Array<{ label: string; value: string; hint: string }>;
  activeFilter: 'all' | 'available' | 'attention' | 'inactive';
  query: string;
  selectedId: number | undefined;
  isCreating: boolean;
  selectedTable: AdminTable | undefined;
  copiedCode: string | null;
  onChangeFilter: (filter: 'all' | 'available' | 'attention' | 'inactive') => void;
  onChangeQuery: (query: string) => void;
  onClearFilters: () => void;
  onStartEdit: (table: AdminTable) => void;
  onPrintTable: (table: AdminTable) => void;
  onCopyLink: (table: AdminTable) => void;
};

export function OwnerTablesList({
  filteredTables,
  tableStats,
  activeFilter,
  query,
  selectedId,
  isCreating,
  selectedTable,
  copiedCode,
  onChangeFilter,
  onChangeQuery,
  onClearFilters,
  onStartEdit,
  onPrintTable,
  onCopyLink,
}: Props) {
  const { t } = useLocale();
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
        <label className="admin-search-wrap">
          <input type="search" placeholder={t('ownerTables.searchTable')} value={query} onChange={(event) => onChangeQuery(event.target.value)} />
          <Search aria-hidden="true" />
        </label>
        <div className="owner-filter-tabs">
          {[
            ['all', t('common.all')],
            ['available', t('common.available')],
            ['attention', t('ownerTables.attention')],
            ['inactive', t('common.inactive')],
          ].map(([filter, label]) => (
            <button className={activeFilter === filter ? 'active' : ''} type="button" key={filter} onClick={() => onChangeFilter(filter as 'all' | 'available' | 'attention' | 'inactive')}>
              {label}
            </button>
          ))}
        </div>
        <p className="tables-result-count">{filteredTables.length} {t('ownerTables.tables')}</p>
      </div>

      <div className="qr-table-grid">
        {filteredTables.map((table) => (
          <article className={`qr-table-card ${table.tone} ${table.id === selectedTable?.id && !isCreating ? 'selected' : ''}`} key={table.id ?? table.code}>
            <button className="qr-card-top" type="button" onClick={() => onStartEdit(table)}>
              <span className={`table-pill ${table.tone === 'inactive' ? 'gold' : 'teal'}`}>{table.code}</span>
              <div>
                <strong>{table.name}</strong>
                <small>
                  {table.area} - {table.seats} {t('ownerTables.seats')}
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
                <small>{table.scans} {t('ownerTables.scansTodaySuffix')}</small>
              </div>
            </div>
            <div className="qr-card-bottom">
              <a href={`/table/${table.code}`} target="_blank" rel="noreferrer">
                /table/{table.code}
              </a>
              <div className="qr-card-actions">
                <button
                  className="qr-icon-action"
                  type="button"
                  aria-label={`${t('ownerTables.printStandee')} ${table.code}`}
                  title={t('ownerTables.printStandee')}
                  onClick={() => onPrintTable(table)}
                >
                  <Printer size={16} aria-hidden="true" />
                </button>
                <button
                  className={`qr-icon-action ${copiedCode === table.code ? 'copied' : ''}`}
                  type="button"
                  aria-label={`${t('ownerTables.copyLink')} ${table.code}`}
                  title={t('ownerTables.copyLink')}
                  onClick={() => onCopyLink(table)}
                >
                  {copiedCode === table.code ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                </button>
                <button
                  className="qr-icon-action"
                  type="button"
                  aria-label={`${t('ownerTables.editTable')} ${table.code}`}
                  title={t('ownerTables.editTable')}
                  onClick={() => onStartEdit(table)}
                >
                  <Pencil size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {filteredTables.length === 0 && (
        <div className="tables-empty-state">
          <strong>{t('ownerTables.noTablesFound')}</strong>
          <p>{t('ownerTables.noTablesFoundHint')}</p>
          <button type="button" onClick={onClearFilters}>{t('ownerTables.resetFilters')}</button>
        </div>
      )}
    </section>
  );
}

'use client';

import { Copy, Download, Pencil, Printer, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AdminTitle, MockSelect } from '..';
import type { AdminTable } from '../runtime-data';

type TableStatus = 'available' | 'occupied' | 'preparing' | 'ready' | 'waiting_payment' | 'need_waiter' | 'inactive';

type TableFormPayload = {
  code: string;
  name: string;
  area: string;
  seats: number;
  status: TableStatus;
};

type TableDraft = {
  code: string;
  name: string;
  area: string;
  seats: string;
  status: TableStatus;
};

const fallbackTables: AdminTable[] = [
  { code: 'A1', name: 'Indoor Window', area: 'Indoor', status: 'Available', rawStatus: 'available', seats: 2, scans: 18, lastOrder: 'No active order', tone: 'available' },
  { code: 'A4', name: 'Indoor Center', area: 'Indoor', status: 'Occupied', rawStatus: 'occupied', seats: 4, scans: 42, lastOrder: 'Order #925 - Ready', tone: 'occupied' },
  { code: 'B2', name: 'Bar Area', area: 'Bar', status: 'Preparing', rawStatus: 'preparing', seats: 2, scans: 31, lastOrder: 'Order #921 - 8 min', tone: 'preparing' },
  { code: 'B7', name: 'Outdoor Bench', area: 'Outdoor', status: 'Need Waiter', rawStatus: 'need_waiter', seats: 4, scans: 27, lastOrder: 'Customer call - 1 min', tone: 'call' },
  { code: 'C2', name: 'Terrace', area: 'Terrace', status: 'Waiting Payment', rawStatus: 'waiting_payment', seats: 3, scans: 22, lastOrder: 'Bill requested', tone: 'payment' },
  { code: 'O1', name: 'Outdoor Surf Corner', area: 'Outdoor', status: 'Inactive', rawStatus: 'inactive', seats: 4, scans: 9, lastOrder: 'QR paused', tone: 'inactive' },
];

const areaOptions = ['Indoor', 'Outdoor', 'Bar', 'Terrace'];
const statusOptions = ['available', 'occupied', 'preparing', 'ready', 'waiting_payment', 'need_waiter', 'inactive'];
const emptyDraft: TableDraft = { code: '', name: '', area: 'Indoor', seats: '2', status: 'available' };

function statusLabel(status: TableStatus) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function draftFromTable(table?: AdminTable): TableDraft {
  if (!table) return emptyDraft;

  return {
    code: table.code,
    name: table.name,
    area: table.area,
    seats: String(table.seats),
    status: table.rawStatus ?? (table.status.toLowerCase().replaceAll(' ', '_') as TableStatus),
  };
}

function payloadFromDraft(draft: TableDraft): TableFormPayload {
  return {
    code: draft.code.trim().toUpperCase(),
    name: draft.name.trim(),
    area: draft.area.trim(),
    seats: Number(draft.seats),
    status: draft.status,
  };
}

export function OwnerTablesView({
  tables,
  onCreateTable,
  onUpdateTable,
  onDeleteTable,
}: {
  tables?: AdminTable[];
  onCreateTable?: (payload: TableFormPayload) => Promise<void> | void;
  onUpdateTable?: (tableId: number | undefined, payload: TableFormPayload) => Promise<void> | void;
  onDeleteTable?: (tableId: number | undefined) => Promise<void> | void;
}) {
  const cafeTables = tables?.length ? tables : fallbackTables;
  const [activeFilter, setActiveFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(cafeTables[0]?.id);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<TableDraft>(() => draftFromTable(cafeTables[0]));
  const [isSaving, setIsSaving] = useState(false);

  const selectedTable = useMemo(
    () => cafeTables.find((table) => table.id === selectedId) ?? cafeTables[0],
    [cafeTables, selectedId],
  );

  useEffect(() => {
    if (isCreating) return;
    const nextTable = cafeTables.find((table) => table.id === selectedId) ?? cafeTables[0];
    setSelectedId(nextTable?.id);
    setDraft(draftFromTable(nextTable));
  }, [cafeTables, selectedId, isCreating]);

  const filteredTables = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return cafeTables.filter((table) => {
      const matchesFilter =
        activeFilter === 'All' ||
        table.area === activeFilter ||
        (activeFilter === 'Inactive' && table.rawStatus === 'inactive');
      const matchesQuery =
        !normalizedQuery ||
        table.code.toLowerCase().includes(normalizedQuery) ||
        table.name.toLowerCase().includes(normalizedQuery) ||
        table.area.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, cafeTables, query]);

  const tableStats = useMemo(
    () => [
      { label: 'Active QR', value: String(cafeTables.filter((table) => table.rawStatus !== 'inactive').length), hint: 'Tables online' },
      { label: 'Scans Today', value: String(cafeTables.reduce((total, table) => total + table.scans, 0)), hint: 'From QR table links' },
      { label: 'Need Action', value: String(cafeTables.filter((table) => ['need_waiter', 'waiting_payment', 'ready'].includes(table.rawStatus ?? '')).length), hint: 'Waiter or payment' },
    ],
    [cafeTables],
  );

  const startCreate = () => {
    setIsCreating(true);
    setSelectedId(undefined);
    setDraft(emptyDraft);
  };

  const startEdit = (table: AdminTable) => {
    setIsCreating(false);
    setSelectedId(table.id);
    setDraft(draftFromTable(table));
  };

  const saveTable = async () => {
    const payload = payloadFromDraft(draft);
    if (!payload.code || !payload.name || !payload.area || !Number.isInteger(payload.seats) || payload.seats <= 0) return;

    setIsSaving(true);
    try {
      if (isCreating) {
        await onCreateTable?.(payload);
        setIsCreating(false);
      } else {
        await onUpdateTable?.(selectedTable?.id, payload);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (!selectedTable?.id) return;
    const approved = window.confirm(`Delete table ${selectedTable.code}? Tables with order history will be set inactive.`);
    if (!approved) return;
    await onDeleteTable?.(selectedTable.id);
  };

  const customerLink = `/table/${draft.code || selectedTable?.code || 'A4'}`;

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Tables & QR" subtitle="Manage table codes, QR stickers, areas, and ordering links." />
        <button className="owner-primary-btn" type="button" onClick={startCreate}>Add Table</button>
      </header>

      <div className="tables-layout">
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
              <input type="search" placeholder="Search table code or area" value={query} onChange={(event) => setQuery(event.target.value)} />
              <Search aria-hidden="true" />
            </label>
            <div className="owner-filter-tabs">
              {['All', 'Indoor', 'Outdoor', 'Inactive'].map((filter) => (
                <button className={activeFilter === filter ? 'active' : ''} type="button" key={filter} onClick={() => setActiveFilter(filter)}>
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="qr-table-grid">
            {filteredTables.map((table) => (
              <article className={`qr-table-card ${table.tone} ${table.id === selectedTable?.id && !isCreating ? 'selected' : ''}`} key={table.id ?? table.code}>
                <button className="qr-card-top" type="button" onClick={() => startEdit(table)}>
                  <span className={`table-pill ${table.tone === 'inactive' ? 'gold' : 'teal'}`}>{table.code}</span>
                  <div><strong>{table.name}</strong><small>{table.area} - {table.seats} seats</small></div>
                </button>
                <div className="qr-card-body">
                  <div className="qr-preview" aria-hidden="true">
                    <span /><span /><span /><span /><span /><span /><span /><span /><span />
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
                    <button className="qr-icon-action" type="button" aria-label={`Print QR for table ${table.code}`}><Printer aria-hidden="true" /></button>
                    <button className="qr-icon-action" type="button" aria-label={`Edit table ${table.code}`} onClick={() => startEdit(table)}><Pencil aria-hidden="true" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="qr-editor-panel">
          <div className="qr-panel-head">
            <span className="mini-status ready">{isCreating ? 'New Table' : 'Selected Table'}</span>
            {!isCreating && (
              <button className="qr-delete-btn" type="button" aria-label="Delete table" onClick={deleteSelected}>
                <Trash2 aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="qr-large-preview">
            <div className="qr-preview big" aria-hidden="true">
              <span /><span /><span /><span /><span /><span /><span /><span /><span />
            </div>
            <strong>Table {draft.code || 'New'}</strong>
            <p>https://blocbarat.local{customerLink}</p>
          </div>

          <div className="qr-link-box">
            <span>Customer Link</span>
            <strong>{customerLink}</strong>
            <button type="button" onClick={() => void navigator.clipboard?.writeText(customerLink)}><Copy aria-hidden="true" />Copy</button>
          </div>

          <div className="editor-fields">
            <label>
              <span>Table Code</span>
              <input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
            </label>
            <label>
              <span>Display Name</span>
              <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <div className="editor-field">
              <span>Area</span>
              <MockSelect value={draft.area} options={areaOptions} onChange={(area) => setDraft((current) => ({ ...current, area }))} />
            </div>
            <label>
              <span>Seats</span>
              <input inputMode="numeric" value={draft.seats} onChange={(event) => setDraft((current) => ({ ...current, seats: event.target.value }))} />
            </label>
            <div className="editor-field">
              <span>Status</span>
              <MockSelect value={draft.status} options={statusOptions} onChange={(status) => setDraft((current) => ({ ...current, status: status as TableStatus }))} />
            </div>
          </div>

          <div className="qr-health-list">
            <p><span>QR status</span><strong>{draft.status === 'inactive' ? 'Paused' : 'Active'}</strong></p>
            <p><span>Scans today</span><strong>{selectedTable?.scans ?? 0}</strong></p>
            <p><span>Current order</span><strong>{selectedTable?.currentOrderId ? `#${selectedTable.currentOrderId}` : '-'}</strong></p>
          </div>

          <div className="qr-actions">
            <button type="button"><Download aria-hidden="true" /><span>Download QR</span></button>
            <button type="button"><Printer aria-hidden="true" /><span>Print Sticker</span></button>
          </div>
          <div className="editor-actions table-editor-actions">
            <button type="button" onClick={() => (isCreating ? setDraft(emptyDraft) : setDraft(draftFromTable(selectedTable)))}>Discard</button>
            <button type="button" disabled={isSaving} onClick={() => void saveTable()}>{isSaving ? 'Saving...' : 'Save Table'}</button>
          </div>
          <button className="bulk-qr-btn" type="button">Bulk Generate QR Codes</button>
        </aside>
      </div>
    </section>
  );
}

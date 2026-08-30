'use client';

import './OwnerTablesView.css';

import { useEffect, useMemo, useState } from 'react';

import { AdminTitle } from '..';
import type { AdminTable } from '../runtime-data';
import { OwnerTablesForm, type TableDraft } from './owner-tables/OwnerTablesForm';
import { OwnerTablesList } from './owner-tables/OwnerTablesList';

type TableStatus = 'available' | 'occupied' | 'preparing' | 'ready' | 'waiting_payment' | 'need_waiter' | 'inactive';

type TableFormPayload = {
  code: string;
  name: string;
  area: string;
  seats: number;
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

const emptyDraft: TableDraft = { code: '', name: '', area: 'Indoor', seats: '2', status: 'available' };

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

  const selectedTable = useMemo(() => cafeTables.find((table) => table.id === selectedId) ?? cafeTables[0], [cafeTables, selectedId]);

  useEffect(() => {
    if (isCreating) return;
    const nextTable = cafeTables.find((table) => table.id === selectedId) ?? cafeTables[0];
    setSelectedId(nextTable?.id);
    setDraft(draftFromTable(nextTable));
  }, [cafeTables, selectedId, isCreating]);

  const filteredTables = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return cafeTables.filter((table) => {
      const matchesFilter = activeFilter === 'All' || table.area === activeFilter || (activeFilter === 'Inactive' && table.rawStatus === 'inactive');
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

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Tables & QR" subtitle="Manage table codes, QR stickers, areas, and ordering links." />
        <button className="owner-primary-btn" type="button" onClick={startCreate}>
          Add Table
        </button>
      </header>

      <div className="tables-layout">
        <OwnerTablesList
          tables={cafeTables}
          filteredTables={filteredTables}
          tableStats={tableStats}
          activeFilter={activeFilter}
          query={query}
          selectedId={selectedId}
          isCreating={isCreating}
          selectedTable={selectedTable}
          onChangeFilter={setActiveFilter}
          onChangeQuery={setQuery}
          onStartEdit={startEdit}
        />
        <OwnerTablesForm
          draft={draft}
          onChangeDraft={setDraft}
          isCreating={isCreating}
          selectedTable={selectedTable}
          isSaving={isSaving}
          onSave={saveTable}
          onDelete={deleteSelected}
          onDiscard={() => (isCreating ? setDraft(emptyDraft) : setDraft(draftFromTable(selectedTable)))}
        />
      </div>
    </section>
  );
}

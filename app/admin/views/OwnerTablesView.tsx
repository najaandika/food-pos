'use client';

import { useEffect, useMemo, useState } from 'react';
import { Printer, X } from 'lucide-react';

import { AdminTitle } from '..';
import { ConfirmModal } from '../ConfirmModal';
import { useLocale } from '../i18n-context';
import type { AdminTable } from '../runtime-data';
import { OwnerTablesForm, type TableDraft } from './owner-tables/OwnerTablesForm';
import { OwnerTablesList } from './owner-tables/OwnerTablesList';

type TableStatus = 'available' | 'occupied' | 'preparing' | 'ready' | 'waiting_payment' | 'need_waiter' | 'inactive';
type TableFilter = 'all' | 'available' | 'attention' | 'inactive';

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
  const { t } = useLocale();
  const cafeTables = tables ?? fallbackTables;
  const [activeFilter, setActiveFilter] = useState<TableFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(cafeTables[0]?.id);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<TableDraft>(() => draftFromTable(cafeTables[0]));
  const [isSaving, setIsSaving] = useState(false);
  const [tableToPrint, setTableToPrint] = useState<AdminTable | null>(null);
  const [tableToDelete, setTableToDelete] = useState<AdminTable | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

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
      const status = table.rawStatus ?? 'available';
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'available' && status === 'available') ||
        (activeFilter === 'attention' && ['need_waiter', 'waiting_payment', 'ready'].includes(status)) ||
        (activeFilter === 'inactive' && status === 'inactive');
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
      { label: t('ownerTables.activeQr'), value: String(cafeTables.filter((table) => table.rawStatus !== 'inactive').length), hint: t('ownerTables.tablesOnline') },
      { label: t('ownerTables.scansToday'), value: String(cafeTables.reduce((total, table) => total + table.scans, 0)), hint: t('ownerTables.fromQrLinks') },
      { label: t('ownerTables.needAction'), value: String(cafeTables.filter((table) => ['need_waiter', 'waiting_payment', 'ready'].includes(table.rawStatus ?? '')).length), hint: t('ownerTables.waiterOrPayment') },
    ],
    [cafeTables, t],
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

  const clearFilters = () => {
    setActiveFilter('all');
    setQuery('');
  };

  const discardTableDraft = () => {
    if (isCreating) {
      const firstTable = cafeTables[0];
      setIsCreating(false);
      setSelectedId(firstTable?.id);
      setDraft(draftFromTable(firstTable));
      return;
    }
    setDraft(draftFromTable(selectedTable));
  };

  const handleCopyLink = async (table: AdminTable) => {
    const url = `${window.location.origin}/table/${table.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(table.code);
      setCopyToast(`${t('ownerTables.linkCopiedSuccess')} ${table.code}`);
      window.setTimeout(() => setCopiedCode(null), 2000);
      window.setTimeout(() => setCopyToast(null), 2800);
    } catch {
      setCopyToast(t('ownerTables.linkCopyFailed'));
      window.setTimeout(() => setCopyToast(null), 2800);
    }
  };

  const handlePrintTable = (table: AdminTable) => {
    setTableToPrint(table);
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

  const requestDeleteTable = (table = selectedTable) => {
    if (!table?.id) return;
    setTableToDelete(table);
  };

  const confirmDeleteTable = async () => {
    if (!tableToDelete?.id) return;
    const tableId = tableToDelete.id;
    setTableToDelete(null);
    await onDeleteTable?.(tableId);
  };

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title={t('ownerTables.title')} subtitle={t('ownerTables.subtitle')} />
        <button className="owner-primary-btn" type="button" onClick={startCreate}>
          {t('ownerTables.addTable')}
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
          copiedCode={copiedCode}
          onChangeFilter={setActiveFilter}
          onChangeQuery={setQuery}
          onClearFilters={clearFilters}
          onStartEdit={startEdit}
          onPrintTable={handlePrintTable}
          onCopyLink={handleCopyLink}
        />
        <OwnerTablesForm
          draft={draft}
          onChangeDraft={setDraft}
          isCreating={isCreating}
          selectedTable={selectedTable}
          isSaving={isSaving}
          onSave={saveTable}
          onDelete={() => requestDeleteTable()}
          onDiscard={discardTableDraft}
          onPrintTable={handlePrintTable}
        />
      </div>

      {/* QR Standee & Sticker Print Modal */}
      {tableToPrint && (
        <div className="admin-modal-overlay" onClick={() => setTableToPrint(null)}>
          <div className="standee-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="standee-modal-header">
              <div>
                <h3>{t('ownerTables.standeeTitle')}</h3>
                <p>{t('ownerTables.standeeDesc')}</p>
              </div>
              <button type="button" className="standee-modal-close" onClick={() => setTableToPrint(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Standee Printable Card */}
            <div className="standee-card-wrap" id="printable-table-standee">
              <div className="standee-card">
                <div className="standee-header">
                  <span className="standee-badge">{t('ownerTables.selfServiceOrder')}</span>
                  <h2>{t('ownerTables.standeeCafeName')}</h2>
                  <p>{t('ownerTables.standeeTagline')}</p>
                </div>

                <div className="standee-table-box">
                  <span className="standee-table-label">{t('ownerTables.tableNumber')}</span>
                  <strong className="standee-table-number">{tableToPrint.code}</strong>
                  <span className="standee-table-area">{tableToPrint.area} • {tableToPrint.seats} {t('ownerTables.seats')}</span>
                </div>

                <div className="standee-qr-frame">
                  <svg viewBox="0 0 200 200" width="170" height="170" className="standee-qr-svg">
                    <rect width="200" height="200" fill="#ffffff" />
                    {/* Position marks */}
                    <rect x="12" y="12" width="46" height="46" fill="#1F2B59" rx="4" />
                    <rect x="20" y="20" width="30" height="30" fill="#ffffff" rx="2" />
                    <rect x="25" y="25" width="20" height="20" fill="#3047FF" rx="2" />

                    <rect x="142" y="12" width="46" height="46" fill="#1F2B59" rx="4" />
                    <rect x="150" y="20" width="30" height="30" fill="#ffffff" rx="2" />
                    <rect x="155" y="25" width="20" height="20" fill="#3047FF" rx="2" />

                    <rect x="12" y="142" width="46" height="46" fill="#1F2B59" rx="4" />
                    <rect x="20" y="150" width="30" height="30" fill="#ffffff" rx="2" />
                    <rect x="25" y="155" width="20" height="20" fill="#3047FF" rx="2" />

                    {/* QR modules pattern */}
                    <path
                      d="M70 14h20v20H70zm30 0h20v10h-20zm0 20h30v10h-30zm-30 20h20v20H70zm30 10h10v20h-10zm20 0h10v10h-10zm20-30h10v30h-10zm-60 40h30v10H70zm40 0h20v30h-20zm-30 20h20v20H80zm50-10h10v30h-10zm20-10h20v10h-20zm-20 30h30v20h-30zm-90 0h20v10H60zm0 20h10v20H60zm20 0h30v10H80zm-10 10h20v10H70zm40-10h30v20h-30zm40 0h20v20h-20z"
                      fill="#1F2B59"
                    />
                  </svg>
                </div>

                <div className="standee-instructions">
                  <p><strong>{t('ownerTables.step1')}</strong></p>
                  <p><strong>{t('ownerTables.step2')}</strong></p>
                  <p><strong>{t('ownerTables.step3')}</strong></p>
                </div>

                <div className="standee-footer">
                  <small>{typeof window !== 'undefined' ? window.location.origin : ''}/table/{tableToPrint.code}</small>
                </div>
              </div>
            </div>

            <div className="standee-modal-actions">
              <button type="button" className="standee-btn-secondary" onClick={() => setTableToPrint(null)}>
                {t('common.close')}
              </button>
              <button
                type="button"
                className="standee-btn-primary"
                onClick={() => window.print()}
              >
                <Printer size={18} />
                <span>{t('ownerTables.printStandee')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {copyToast && (
        <div className="admin-action-toast success" role="status">
          {copyToast}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(tableToDelete)}
        title={t('ownerTables.deleteTitle')}
        message={t('ownerTables.deleteConfirm')}
        targetName={tableToDelete ? `${t('ownerTables.tableCode')} ${tableToDelete.code}` : undefined}
        targetDetails={tableToDelete ? `${tableToDelete.area} • ${tableToDelete.seats} ${t('ownerTables.seats')}` : undefined}
        confirmLabel={t('ownerTables.deleteConfirmAction')}
        cancelLabel={t('common.cancel')}
        isDanger={true}
        onConfirm={confirmDeleteTable}
        onCancel={() => setTableToDelete(null)}
      />
    </section>
  );
}


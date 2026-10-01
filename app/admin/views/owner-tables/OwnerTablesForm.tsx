'use client';

import { Check, Copy, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MockSelect } from '../..';
import { useLocale } from '../../i18n-context';
import type { AdminTable } from '../../runtime-data';

type TableStatus = 'available' | 'occupied' | 'preparing' | 'ready' | 'waiting_payment' | 'need_waiter' | 'inactive';

type TableDraft = {
  code: string;
  name: string;
  area: string;
  seats: string;
  status: TableStatus;
};

const areaOptions = ['Indoor', 'Outdoor', 'Bar', 'Terrace'];
const statusOptions = ['available', 'occupied', 'preparing', 'ready', 'waiting_payment', 'need_waiter', 'inactive'];

type Props = {
  draft: TableDraft;
  onChangeDraft: (updater: (current: TableDraft) => TableDraft) => void;
  isCreating: boolean;
  selectedTable: AdminTable | undefined;
  isSaving: boolean;
  onSave: () => void;
  onDelete: () => void;
  onDiscard: () => void;
  onPrintTable?: (table: AdminTable) => void;
};

export function OwnerTablesForm({ draft, onChangeDraft, isCreating, selectedTable, isSaving, onSave, onDelete, onDiscard, onPrintTable }: Props) {
  const { t } = useLocale();
  const [formCopied, setFormCopied] = useState(false);
  const currentTableCode = draft.code || selectedTable?.code || 'A1';
  const customerLink = `/table/${currentTableCode}`;

  const handleCopyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${customerLink}`;
      await navigator.clipboard.writeText(fullUrl);
      setFormCopied(true);
      window.setTimeout(() => setFormCopied(false), 2000);
    } catch {
      setFormCopied(false);
    }
  };

  return (
    <aside className="qr-editor-panel">
      <div className="qr-panel-head">
        <span className="mini-status ready">{isCreating ? t('ownerTables.newTable') : t('ownerTables.selectedTable')}</span>
        {!isCreating && (
          <button className="qr-delete-btn" type="button" aria-label={t('common.delete')} onClick={onDelete}>
            <Trash2 aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="qr-large-preview">
        <div className="qr-preview big" aria-hidden="true">
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
        <strong>{t('ownerTables.tableLabel')} {draft.code || t('ownerTables.newLabel')}</strong>
        <p>{typeof window !== 'undefined' ? window.location.origin : 'https://pos.local'}{customerLink}</p>
        {!isCreating && selectedTable && onPrintTable && (
          <button
            type="button"
            className="qr-form-print-btn"
            onClick={() => onPrintTable(selectedTable)}
          >
            <Printer size={16} aria-hidden="true" />
            <span>{t('ownerTables.printStandee')}</span>
          </button>
        )}
      </div>

      <div className="qr-link-box">
        <span>{t('ownerTables.customerLink')}</span>
        <strong>{customerLink}</strong>
        <button
          type="button"
          className={formCopied ? 'copied' : ''}
          onClick={handleCopyLink}
        >
          {formCopied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {formCopied ? t('common.copied') : t('common.copy')}
        </button>
      </div>

      <div className="editor-fields">
        <label>
          <span>{t('ownerTables.tableCode')}</span>
          <input value={draft.code} onChange={(event) => onChangeDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
        </label>
        <label>
          <span>{t('ownerTables.displayName')}</span>
          <input value={draft.name} onChange={(event) => onChangeDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <div className="editor-field">
          <span>{t('ownerTables.area')}</span>
          <MockSelect value={draft.area} options={areaOptions} onChange={(area) => onChangeDraft((current) => ({ ...current, area }))} />
        </div>
        <label>
          <span>{t('ownerTables.seats')}</span>
          <input inputMode="numeric" value={draft.seats} onChange={(event) => onChangeDraft((current) => ({ ...current, seats: event.target.value }))} />
        </label>
        <div className="editor-field">
          <span>{t('ownerTables.status')}</span>
          <MockSelect value={draft.status} options={statusOptions} onChange={(status) => onChangeDraft((current) => ({ ...current, status: status as TableStatus }))} />
        </div>
      </div>

      <div className="qr-health-list">
        <p>
          <span>{t('ownerTables.qrStatus')}</span>
          <strong>{draft.status === 'inactive' ? t('ownerTables.paused') : t('common.active')}</strong>
        </p>
        <p>
          <span>{t('ownerTables.scansToday')}</span>
          <strong>{selectedTable?.scans ?? 0}</strong>
        </p>
        <p>
          <span>{t('ownerTables.currentOrder')}</span>
          <strong>{selectedTable?.currentOrderId ? `#${selectedTable.currentOrderId}` : '-'}</strong>
        </p>
      </div>

      <div className="editor-actions table-editor-actions">
        <button type="button" onClick={onDiscard}>
          {t('common.discard')}
        </button>
        <button type="button" disabled={isSaving} onClick={() => void onSave()}>
          {isSaving ? t('common.saving') : t('ownerTables.saveTable')}
        </button>
      </div>
    </aside>
  );
}

export type { TableDraft };

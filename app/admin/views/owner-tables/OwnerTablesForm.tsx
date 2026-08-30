'use client';

import { Copy, Download, Printer, Trash2 } from 'lucide-react';
import { MockSelect } from '../..';
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
};

export function OwnerTablesForm({ draft, onChangeDraft, isCreating, selectedTable, isSaving, onSave, onDelete, onDiscard }: Props) {
  const customerLink = `/table/${draft.code || selectedTable?.code || 'A4'}`;

  return (
    <aside className="qr-editor-panel">
      <div className="qr-panel-head">
        <span className="mini-status ready">{isCreating ? 'New Table' : 'Selected Table'}</span>
        {!isCreating && (
          <button className="qr-delete-btn" type="button" aria-label="Delete table" onClick={onDelete}>
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
        <strong>Table {draft.code || 'New'}</strong>
        <p>https://blocbarat.local{customerLink}</p>
      </div>

      <div className="qr-link-box">
        <span>Customer Link</span>
        <strong>{customerLink}</strong>
        <button type="button" onClick={() => void navigator.clipboard?.writeText(customerLink)}>
          <Copy aria-hidden="true" />
          Copy
        </button>
      </div>

      <div className="editor-fields">
        <label>
          <span>Table Code</span>
          <input value={draft.code} onChange={(event) => onChangeDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
        </label>
        <label>
          <span>Display Name</span>
          <input value={draft.name} onChange={(event) => onChangeDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <div className="editor-field">
          <span>Area</span>
          <MockSelect value={draft.area} options={areaOptions} onChange={(area) => onChangeDraft((current) => ({ ...current, area }))} />
        </div>
        <label>
          <span>Seats</span>
          <input inputMode="numeric" value={draft.seats} onChange={(event) => onChangeDraft((current) => ({ ...current, seats: event.target.value }))} />
        </label>
        <div className="editor-field">
          <span>Status</span>
          <MockSelect value={draft.status} options={statusOptions} onChange={(status) => onChangeDraft((current) => ({ ...current, status: status as TableStatus }))} />
        </div>
      </div>

      <div className="qr-health-list">
        <p>
          <span>QR status</span>
          <strong>{draft.status === 'inactive' ? 'Paused' : 'Active'}</strong>
        </p>
        <p>
          <span>Scans today</span>
          <strong>{selectedTable?.scans ?? 0}</strong>
        </p>
        <p>
          <span>Current order</span>
          <strong>{selectedTable?.currentOrderId ? `#${selectedTable.currentOrderId}` : '-'}</strong>
        </p>
      </div>

      <div className="qr-actions">
        <button type="button">
          <Download aria-hidden="true" />
          <span>Download QR</span>
        </button>
        <button type="button">
          <Printer aria-hidden="true" />
          <span>Print Sticker</span>
        </button>
      </div>
      <div className="editor-actions table-editor-actions">
        <button type="button" onClick={onDiscard}>
          Discard
        </button>
        <button type="button" disabled={isSaving} onClick={() => void onSave()}>
          {isSaving ? 'Saving...' : 'Save Table'}
        </button>
      </div>
      <button className="bulk-qr-btn" type="button">
        Bulk Generate QR Codes
      </button>
    </aside>
  );
}

export type { TableDraft };

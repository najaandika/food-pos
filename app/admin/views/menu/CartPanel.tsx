'use client';

import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

import { formatRupiah } from '../../../lib/format';

import type { AdminDish } from '../../runtime-data';

type CartLine = AdminDish & { cartQty: number; note?: string };

type SentOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  table: string;
  itemCount: number;
  total: number;
} | null;

type Props = {
  cartLines: CartLine[];
  itemCount: number;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  taxRate: number;
  serviceRate: number;
  customerName: string;
  guests: number;
  orderType: 'dine_in' | 'takeaway';
  tableCode: string;
  submitting: boolean;
  sendError: string;
  sentOrder: SentOrder;
  onSendOrder: () => void;
  onChangeLineNote: (dishId: number | undefined, note: string) => void;
  onStartNewTicket: () => void;
  onGoToOrders?: () => void;
  onGoToCashier?: () => void;
};

export function CartPanel({
  cartLines,
  itemCount,
  subtotal,
  tax,
  serviceCharge,
  total,
  taxRate,
  serviceRate,
  customerName,
  guests,
  orderType,
  tableCode,
  submitting,
  sendError,
  sentOrder,
  onSendOrder,
  onChangeLineNote,
  onStartNewTicket,
  onGoToOrders,
  onGoToCashier,
}: Props) {
  const [editingNote, setEditingNote] = useState<number | undefined>();

  return (
    <aside className="receipt-panel">
      <div className="receipt-top">
        <div className="receipt-customer">
          <div>
            <span>Current Ticket</span>
            <h3>{customerName}</h3>
            <small>{orderType === 'takeaway' ? 'Takeaway' : `Dine In / ${guests} guests`}</small>
          </div>
        </div>
        <div className="receipt-meta-chips">
          <span>{orderType === 'dine_in' ? `Table ${tableCode}` : 'Takeaway'}</span>
          <span>Draft</span>
        </div>
      </div>
      <p className="receipt-date">{sentOrder ? `Order #${sentOrder.orderNumber} sent to kitchen` : 'Ready to send to kitchen queue'}</p>
      <div className="ticket-readiness">
        <span>
          <b></b> {sentOrder ? 'Kitchen received' : 'Kitchen queue live'}
        </span>
        <span>
          <b></b> Pay after serve
        </span>
      </div>
      {sentOrder && (
        <div className="order-sent-card">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <span>Order sent</span>
            <strong>{sentOrder.customerName}</strong>
            <p>
              {sentOrder.table} / {sentOrder.itemCount} items / {formatRupiah(sentOrder.total)}
            </p>
          </div>
        </div>
      )}
      {sendError && <p className="pos-send-error">{sendError}</p>}
      {sentOrder && (
        <div className="post-send-actions">
          <button type="button" onClick={onGoToOrders}>
            View Orders
          </button>
          <button type="button" onClick={onGoToCashier}>
            Open Cashier
          </button>
        </div>
      )}
      <div className="receipt-order-scroll">
        <h3>Order Detail</h3>
        <div className="receipt-items">
          {cartLines.map((line) => (
            <div className="receipt-item" key={line.id}>
              <div>
                <strong>{line.name}</strong>
                <button type="button" onClick={() => setEditingNote(editingNote === line.id ? undefined : line.id)}>
                  {line.note ? 'Edit note' : 'Notes'}
                </button>
                {editingNote === line.id && (
                  <textarea
                    value={line.note ?? ''}
                    onChange={(event) => onChangeLineNote(line.id, event.target.value)}
                    placeholder="Add item note"
                    rows={2}
                  />
                )}
              </div>
              <b>x{line.cartQty}</b>
              <strong>{formatRupiah((line.rawPrice ?? 0) * line.cartQty)}</strong>
            </div>
          ))}
          {!cartLines.length && (
            <p className="receipt-date">{sentOrder ? 'Start a new ticket or continue monitoring from Orders.' : 'No items selected.'}</p>
          )}
        </div>
      </div>
      <div className="receipt-footer">
        <div className="receipt-total">
          <span>Items ({itemCount})</span>
          <strong>{formatRupiah(subtotal)}</strong>
        </div>
        <div className="receipt-total">
          <span>Tax ({taxRate}%)</span>
          <strong>{formatRupiah(tax)}</strong>
        </div>
        {serviceRate > 0 && (
          <div className="receipt-total">
            <span>Service ({serviceRate}%)</span>
            <strong>{formatRupiah(serviceCharge)}</strong>
          </div>
        )}
        <button className="proceed-btn" type="button" disabled={!itemCount || submitting} onClick={() => void onSendOrder()}>
          <strong>{formatRupiah(total)}</strong>
          <span>{submitting ? 'Sending...' : 'Send Order ->'}</span>
        </button>
        {sentOrder && (
          <button className="new-ticket-btn" type="button" onClick={onStartNewTicket}>
            New Ticket
          </button>
        )}
      </div>
    </aside>
  );
}

'use client';

import { CheckCircle2, ChefHat, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { formatRupiah } from '../../../lib/format';
import { useLocale } from '../../i18n-context';

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
  const { t } = useLocale();
  const [editingNote, setEditingNote] = useState<number | undefined>();

  return (
    <aside className="receipt-panel">
      <div className="receipt-top">
        <div className="receipt-customer">
          <div>
            <span>{t('cart.currentTicket')}</span>
            <h3>{customerName}</h3>
            <small>{orderType === 'takeaway' ? t('menu.takeaway') : `${t('menu.dineIn')} / ${guests} ${t('common.guests')}`}</small>
          </div>
        </div>
        <div className="receipt-meta-chips">
          <span>{orderType === 'dine_in' ? `${t('common.table')} ${tableCode}` : t('menu.takeaway')}</span>
          <span>{t('cart.draft')}</span>
        </div>
      </div>
      <p className="receipt-date">{sentOrder ? t('cart.orderSentToKitchen').replace('{number}', sentOrder.orderNumber) : t('cart.readyToSend')}</p>
      <div className="ticket-readiness">
        <span>
          <b></b> {sentOrder ? t('cart.kitchenReceived') : t('cart.kitchenQueueLive')}
        </span>
        <span>
          <b></b> {t('cart.payAfterServe')}
        </span>
      </div>
      {sentOrder && (
        <div className="order-sent-card">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <span>{t('cart.orderSent')}</span>
            <strong>{sentOrder.customerName}</strong>
            <p>
              {sentOrder.table} / {sentOrder.itemCount} {t('common.items')} / {formatRupiah(sentOrder.total)}
            </p>
          </div>
        </div>
      )}
      {sendError && <p className="pos-send-error">{sendError}</p>}
      {sentOrder && (
        <div className="post-send-actions">
          <button type="button" onClick={onGoToOrders}>
            {t('cart.viewOrders')}
          </button>
          <button type="button" onClick={onGoToCashier}>
            {t('dashboard.openCashier')}
          </button>
        </div>
      )}
      <div className="receipt-order-scroll">
        <h3>{t('cart.orderDetail')}</h3>
        <div className="receipt-items">
          {cartLines.map((line) => (
            <div className="receipt-item" key={line.id}>
              <div>
                <strong>{line.name}</strong>
                <button type="button" onClick={() => setEditingNote(editingNote === line.id ? undefined : line.id)}>
                  {line.note ? t('cart.editNote') : t('cart.notes')}
                </button>
                {editingNote === line.id && (
                  <textarea
                    value={line.note ?? ''}
                    onChange={(event) => onChangeLineNote(line.id, event.target.value)}
                    placeholder={t('cart.addItemNote')}
                    rows={2}
                  />
                )}
              </div>
              <b>x{line.cartQty}</b>
              <strong>{formatRupiah((line.rawPrice ?? 0) * line.cartQty)}</strong>
            </div>
          ))}
          {!cartLines.length && (
            <p className="receipt-date">{sentOrder ? t('cart.startNewTicketDesc') : t('cart.noItemsSelected')}</p>
          )}
        </div>
      </div>
      <div className="receipt-footer">
        <div className="receipt-total">
          <span>{t('common.items')} ({itemCount})</span>
          <strong>{formatRupiah(subtotal)}</strong>
        </div>
        <div className="receipt-total">
          <span>{t('cart.tax')} ({taxRate}%)</span>
          <strong>{formatRupiah(tax)}</strong>
        </div>
        {serviceRate > 0 && (
          <div className="receipt-total">
            <span>{t('cart.service')} ({serviceRate}%)</span>
            <strong>{formatRupiah(serviceCharge)}</strong>
          </div>
        )}
        <button
          className={`proceed-btn ${itemCount > 0 ? 'is-active' : 'is-empty'}`}
          type="button"
          disabled={!itemCount || submitting}
          onClick={() => void onSendOrder()}
          aria-label={itemCount > 0 ? `${t('cart.sendOrder')}, total ${formatRupiah(total)}` : t('cart.noItemsSelected')}
        >
          <div className="proceed-btn-amount">
            <span className="proceed-btn-count">
              {itemCount > 0 ? `${itemCount} ${t('common.items')}` : t('cart.noItemsSelected')}
            </span>
            <strong>{formatRupiah(total)}</strong>
          </div>
          <div className="proceed-btn-action">
            {submitting ? (
              <>
                <Loader2 className="pos-spin-icon" size={19} aria-hidden="true" />
                <span>{t('cart.sendingOrder')}</span>
              </>
            ) : (
              <>
                <div className="proceed-btn-icon-capsule">
                  <ChefHat size={18} aria-hidden="true" />
                </div>
                <span>{t('cart.sendOrder')}</span>
              </>
            )}
          </div>
        </button>
        {sentOrder && (
          <button className="new-ticket-btn" type="button" onClick={onStartNewTicket}>
            {t('cart.newTicket')}
          </button>
        )}
      </div>
    </aside>
  );
}

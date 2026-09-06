'use client';

import type { AdminOrder } from '../../runtime-data';

type Props = {
  orderType: 'dine_in' | 'takeaway';
  tableCode: string;
  customerName: string;
  guests: number;
  itemCount: number;
  orders: AdminOrder[];
  onChangeOrderType: (type: 'dine_in' | 'takeaway') => void;
  qrMode: boolean;
  onToggleQrMode: () => void;
};

export function CommandBar({ orderType, tableCode, customerName, guests, itemCount, orders, onChangeOrderType, qrMode, onToggleQrMode }: Props) {
  const latestOrder = orders[0];
  const queueCount = orders.filter((order) => order.rawStatus && !['paid', 'cancelled'].includes(order.rawStatus)).length;

  return (
    <div className="pos-command-bar">
      <div className="pos-live-ticket">
        <span className="pos-table-chip">{orderType === 'dine_in' ? `Table ${tableCode}` : 'TA'}</span>
        <div>
          <small>Active Ticket</small>
          <strong>{customerName}</strong>
          <em>
            {orderType === 'takeaway' ? 'Takeaway' : `Dine In / ${guests} guests`} / {itemCount} items
          </em>
        </div>
      </div>
      <div className="order-type-tabs" aria-label="Order type">
        <button className={orderType === 'dine_in' ? 'active' : ''} type="button" onClick={() => onChangeOrderType('dine_in')}>
          Dine In
        </button>
        <button className={orderType === 'takeaway' ? 'active' : ''} type="button" onClick={() => onChangeOrderType('takeaway')}>
          Takeaway
        </button>
        <button className={qrMode ? 'active' : ''} type="button" onClick={onToggleQrMode}>QR ({orders.filter((order) => order.source === 'qr').length})</button>
      </div>
      <div className="pos-counter-stats">
        <article>
          <span>Queue</span>
          <strong>{queueCount}</strong>
        </article>
        <article>
          <span>Kitchen</span>
          <strong>Open</strong>
        </article>
        <article>
          <span>Last sent</span>
          <strong>{latestOrder?.time ?? '-'}</strong>
        </article>
      </div>
    </div>
  );
}

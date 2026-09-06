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
    <div className={`pos-command-bar${qrMode ? ' qr-mode' : ''}`}>
      <div className={`pos-live-ticket${qrMode ? ' qr-live-ticket' : ''}`}>
        <span className="pos-table-chip">{qrMode ? 'QR' : orderType === 'dine_in' ? `Table ${tableCode}` : 'TA'}</span>
        <div>
          <small>{qrMode ? 'QR Order Queue' : 'Active Ticket'}</small>
          <strong>{qrMode ? 'Incoming Customer Orders' : customerName}</strong>
          <em>
            {qrMode
              ? `${orders.filter((order) => order.source === 'qr').length} orders waiting`
              : `${orderType === 'takeaway' ? 'Takeaway' : `Dine In / ${guests} guests`} / ${itemCount} items`}
          </em>
        </div>
      </div>
      <div className="order-type-tabs" aria-label="Order type">
        <button className={orderType === 'dine_in' && !qrMode ? 'active' : ''} type="button" onClick={() => onChangeOrderType('dine_in')}>
          Dine In
        </button>
        <button className={orderType === 'takeaway' && !qrMode ? 'active' : ''} type="button" onClick={() => onChangeOrderType('takeaway')}>
          Takeaway
        </button>
        <button className={qrMode ? 'active' : ''} type="button" onClick={onToggleQrMode}>QR ({orders.filter((order) => order.source === 'qr').length})</button>
      </div>
      {!qrMode && <div className="pos-counter-stats">
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
      </div>}
    </div>
  );
}

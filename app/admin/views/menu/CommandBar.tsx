'use client';

import type { AdminOrder } from '../../runtime-data';
import { useLocale } from '../../i18n-context';

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
  const { t } = useLocale();
  const latestOrder = orders[0];
  const queueCount = orders.filter((order) => order.rawStatus && !['paid', 'cancelled'].includes(order.rawStatus)).length;

  return (
    <div className={`pos-command-bar${qrMode ? ' qr-mode' : ''}`}>
      <div className={`pos-live-ticket${qrMode ? ' qr-live-ticket' : ''}`}>
        <span className="pos-table-chip">{qrMode ? 'QR' : orderType === 'dine_in' ? `${t('common.table')} ${tableCode}` : 'TA'}</span>
        <div>
          <small>{qrMode ? t('menu.qrOrders') : t('menu.activeTicket')}</small>
          <strong>{qrMode ? t('menu.incomingOrders') : customerName}</strong>
          <em>
            {qrMode
              ? `${orders.filter((order) => order.source === 'qr').length} ${t('menu.ordersWaiting')}`
              : `${orderType === 'takeaway' ? t('menu.takeaway') : `${t('menu.dineIn')} / ${guests} ${t('common.guests')}`} / ${itemCount} ${t('common.items')}`}
          </em>
        </div>
      </div>
      <div className="order-type-tabs" aria-label="Order type">
        <button className={orderType === 'dine_in' && !qrMode ? 'active' : ''} type="button" onClick={() => onChangeOrderType('dine_in')}>
          {t('menu.dineIn')}
        </button>
        <button className={orderType === 'takeaway' && !qrMode ? 'active' : ''} type="button" onClick={() => onChangeOrderType('takeaway')}>
          {t('menu.takeaway')}
        </button>
        <button className={qrMode ? 'active' : ''} type="button" onClick={onToggleQrMode}>QR ({orders.filter((order) => order.source === 'qr').length})</button>
      </div>
      {!qrMode && <div className="pos-counter-stats">
        <article>
          <span>{t('menu.queue')}</span>
          <strong>{queueCount}</strong>
        </article>
        <article>
          <span>{t('menu.kitchen')}</span>
          <strong>{t('common.open')}</strong>
        </article>
        <article>
          <span>{t('menu.lastSent')}</span>
          <strong>{latestOrder?.time ?? '-'}</strong>
        </article>
      </div>}
    </div>
  );
}

'use client';

import { Bell, CheckCircle2, Clock3, MapPin, Plus, RefreshCw, UsersRound } from 'lucide-react';

import { AdminTitle, orders as fallbackOrders } from '..';
import type { PosOrderStatus, PosTableStatus } from '../../../lib/pos-types';
import type { AdminOrder, AdminTable } from '../runtime-data';
import { useLocale } from '../i18n-context';

type ServiceTone = 'available' | 'ready' | 'preparing' | 'call' | 'payment' | 'takeaway';

const nextWaiterAction: Partial<Record<PosOrderStatus, { label: string; status: PosOrderStatus }>> = {
  pending: { label: 'Accept', status: 'accepted' },
  accepted: { label: 'Kitchen', status: 'preparing' },
  preparing: { label: 'Ready', status: 'ready' },
  ready: { label: 'Serve', status: 'served' },
  served: { label: 'Send Bill', status: 'waiting_payment' },
};

const fallbackTables: AdminTable[] = [
  { id: 1, code: 'A1', name: 'Window', area: 'Indoor', seats: 2, status: 'Available', rawStatus: 'available', scans: 18, lastOrder: 'No active order', currentOrderId: null, tone: 'available' },
  { id: 2, code: 'A4', name: 'Indoor Center', area: 'Indoor', seats: 4, status: 'Ready', rawStatus: 'ready', scans: 42, lastOrder: 'Order ready', currentOrderId: null, tone: 'occupied' },
  { id: 3, code: 'B2', name: 'Bar Area', area: 'Bar', seats: 2, status: 'Preparing', rawStatus: 'preparing', scans: 31, lastOrder: 'Preparing', currentOrderId: null, tone: 'occupied' },
];

export function WaitersView({
  orders = fallbackOrders,
  tables = fallbackTables,
  onUpdateStatus,
}: {
  orders?: AdminOrder[];
  tables?: AdminTable[];
  onUpdateStatus?: (orderId: number | undefined, status: PosOrderStatus) => void;
}) {
  const { t } = useLocale();

  const tableStatusCopy: Record<PosTableStatus, { label: string; tone: ServiceTone; eta: string }> = {
    available: { label: t('common.available'), tone: 'available', eta: t('common.open') },
    occupied: { label: t('dashboard.occupied'), tone: 'preparing', eta: t('common.active') },
    preparing: { label: t('dashboard.preparing'), tone: 'preparing', eta: '8 min' },
    ready: { label: t('dashboard.ready'), tone: 'ready', eta: t('waiters.serve') },
    waiting_payment: { label: t('dashboard.waitingPayment'), tone: 'payment', eta: t('orders.billing') },
    need_waiter: { label: t('waiters.customerCalls'), tone: 'call', eta: '2 min' },
    inactive: { label: t('common.inactive'), tone: 'available', eta: '-' },
  };

  const activeTables = tables.filter((table) => table.rawStatus !== 'inactive');
  const readyOrders = orders.filter((order) => order.rawStatus === 'ready');
  const customerCalls = tables.filter((table) => table.rawStatus === 'need_waiter');
  const waitersStats = [
    { label: t('waiters.activeTables'), value: String(activeTables.length), hint: `${activeTables.filter((table) => table.rawStatus !== 'available').length} ${t('waiters.occupiedNow')}`, tone: 'active', icon: UsersRound },
    { label: t('waiters.readyToServe'), value: String(readyOrders.length), hint: t('waiters.liveKitchenPass'), tone: 'ready', icon: CheckCircle2 },
    { label: t('waiters.customerCalls'), value: String(customerCalls.length), hint: t('waiters.needsResponse'), tone: 'call', icon: Bell },
  ];
  const serviceOrders = orders.filter((order) => order.rawStatus && ['pending', 'accepted', 'preparing', 'ready', 'served', 'waiting_payment'].includes(order.rawStatus));
  const requests = [
    ...customerCalls.map((table) => ({ table: table.code, text: `${table.name} ${t('waiters.requestedWaiter')}`, time: t('common.now'), tone: 'call' as ServiceTone, priority: t('waiters.priority') })),
    ...readyOrders.slice(0, 3).map((order) => ({ table: order.table, text: `${order.name} ${t('waiters.readyToServeOrder')}`, time: order.time, tone: 'ready' as ServiceTone, priority: t('waiters.serve') })),
    ...orders.filter((order) => order.rawStatus === 'waiting_payment').slice(0, 2).map((order) => ({ table: order.table, text: `${order.name} ${t('waiters.requestedBill')}`, time: order.time, tone: 'payment' as ServiceTone, priority: t('orders.sendBill') })),
  ];

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title={t('waiters.title')} subtitle={t('waiters.subtitle')} />
        <div className="cashier-shift"><span>{t('waiters.floor')}</span><strong>{t('waiters.mainAreaEvening')}</strong></div>
      </header>

      <div className="waiters-layout">
        <section className="waiters-main">
          <div className="waiters-summary">
            {waitersStats.map((stat) => (
              <article className={`waiters-stat ${stat.tone}`} key={stat.label}>
                <div className="waiters-stat-icon"><stat.icon aria-hidden="true" /></div>
                <div>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <small>{stat.hint}</small>
                </div>
              </article>
            ))}
          </div>

          <section className="waiters-panel">
            <div className="cashier-panel-head">
              <div><h2>{t('waiters.tableStatus')}</h2><p>{t('waiters.monitorTables')}</p></div>
              <button type="button"><RefreshCw aria-hidden="true" />{t('common.refresh')}</button>
            </div>
            <div className="waiters-zone-tabs">
              <button className="active" type="button">{t('waiters.allArea')}</button>
              <button type="button">{t('waiters.indoor')}</button>
              <button type="button">{t('waiters.outdoor')}</button>
              <button type="button">{t('waiters.counter')}</button>
            </div>
            <div className="table-status-grid">
              {tables.map((table) => {
                const status = tableStatusCopy[table.rawStatus ?? 'available'] ?? { label: table.status, tone: 'available', eta: '-' };
                const linkedOrder = orders.find((order) => order.id === table.currentOrderId || order.table === table.code);
                return (
                  <button className={`table-status-card ${status.tone}`} type="button" key={table.id ?? table.code}>
                    <div className="table-card-head">
                      <span className="table-code">{table.code}</span>
                      <span className="table-state">{status.label}</span>
                    </div>
                    <div className="table-card-body">
                      <strong>{table.name}</strong>
                      <small><MapPin aria-hidden="true" />{table.seats} {t('waiters.seats')} - {table.area}</small>
                    </div>
                    <div className="table-card-foot">
                      <span><Clock3 aria-hidden="true" />{linkedOrder?.name ?? status.eta}</span>
                      <em>{status.tone === 'ready' ? t('waiters.serve') : status.tone === 'call' ? t('waiters.handle') : t('waiters.view')}</em>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="waiters-panel">
            <div className="cashier-panel-head">
              <div><h2>{t('waiters.customerRequests')}</h2><p>{t('waiters.customerRequestsDesc')}</p></div>
              <button type="button"><Plus aria-hidden="true" />{t('waiters.addNote')}</button>
            </div>
            <div className="waiter-request-list">
              {requests.length ? requests.map((request) => (
                <article className={`waiter-request ${request.tone}`} key={`${request.table}-${request.text}`}>
                  <span className="request-table">{request.table}</span>
                  <div><strong>{request.text}</strong><small>{request.time}</small></div>
                  <em>{request.priority}</em>
                  <button type="button">{t('waiters.handle')}</button>
                </article>
              )) : <p className="empty-state">{t('waiters.noRequests')}</p>}
            </div>
          </section>
        </section>

        <aside className="service-queue">
          <div className="cashier-panel-head">
            <div><h2>{t('waiters.serviceQueue')}</h2><p>{t('waiters.serviceQueueDesc')}</p></div>
          </div>
          <div className="service-queue-strip">
            <span><b>{readyOrders.length}</b> {t('waiters.readyLabel')}</span>
            <span><b>{customerCalls.length}</b> {t('waiters.callsLabel')}</span>
            <span><b>{serviceOrders.length}</b> {t('waiters.activeLabel')}</span>
          </div>

          <div className="service-list">
            {serviceOrders.map((order) => {
              const action = order.rawStatus ? nextWaiterAction[order.rawStatus] : undefined;
              return (
                <article className={`service-card ${order.rawStatus === 'ready' ? 'urgent' : ''}`} key={order.id ?? `${order.name}-${order.table}`}>
                  <div>
                    <span className={`table-pill ${order.tone}`}>{order.table}</span>
                    <div><strong>{order.name}</strong><small>{order.meta}</small></div>
                  </div>
                  <p>{order.rawStatus ? t(`waiters.hint.${order.rawStatus}`) || order.rawStatus : 'Needs waiter action.'}</p>
                  <div className="service-meta">
                    <span>{order.rawStatus === 'ready' ? t('waiters.priority') : order.status}</span>
                    <b>{order.time}</b>
                  </div>
                  <div className="service-actions">
                    <button type="button" disabled={!action} onClick={() => action && onUpdateStatus?.(order.id, action.status)}>{action?.label ? (action.label === 'Accept' ? t('orders.accept') : action.label === 'Kitchen' ? t('orders.kitchen') : action.label === 'Ready' ? t('orders.ready') : action.label === 'Serve' ? t('orders.serve') : t('orders.sendBill')) : t('common.details')}</button>
                    <button type="button">{t('common.details')}</button>
                  </div>
                </article>
              );
            })}
            {serviceOrders.length === 0 && <p className="empty-state">{t('waiters.noActions')}</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}

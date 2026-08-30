'use client';

import './WaitersView.css';

import { Bell, CheckCircle2, Clock3, MapPin, Plus, RefreshCw, UsersRound } from 'lucide-react';

import { AdminTitle, orders as fallbackOrders } from '..';
import type { PosOrderStatus, PosTableStatus } from '../../../lib/pos-types';
import type { AdminOrder, AdminTable } from '../runtime-data';

type ServiceTone = 'available' | 'ready' | 'preparing' | 'call' | 'payment' | 'takeaway';

const tableStatusCopy: Record<PosTableStatus, { label: string; tone: ServiceTone; eta: string }> = {
  available: { label: 'Available', tone: 'available', eta: 'Open' },
  occupied: { label: 'Occupied', tone: 'preparing', eta: 'Active' },
  preparing: { label: 'Preparing', tone: 'preparing', eta: '8 min' },
  ready: { label: 'Ready', tone: 'ready', eta: 'Serve now' },
  waiting_payment: { label: 'Waiting Payment', tone: 'payment', eta: 'Bill ready' },
  need_waiter: { label: 'Need Waiter', tone: 'call', eta: '2 min' },
  inactive: { label: 'Inactive', tone: 'available', eta: 'Paused' },
};

const nextWaiterAction: Partial<Record<PosOrderStatus, { label: string; status: PosOrderStatus }>> = {
  pending: { label: 'Accept', status: 'accepted' },
  accepted: { label: 'Kitchen', status: 'preparing' },
  preparing: { label: 'Ready', status: 'ready' },
  ready: { label: 'Serve', status: 'served' },
  served: { label: 'Send Bill', status: 'waiting_payment' },
};

const waiterStatusHint: Record<PosOrderStatus, string> = {
  pending: 'New table order. Accept it before kitchen starts.',
  accepted: 'Accepted by staff. Send it to kitchen or bar.',
  preparing: 'Kitchen is preparing this ticket.',
  ready: 'Ready on the pass. Serve this first.',
  served: 'Served to guest. Send bill when requested.',
  waiting_payment: 'Bill sent to cashier.',
  paid: 'Closed by cashier.',
  cancelled: 'Cancelled ticket.',
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
  const activeTables = tables.filter((table) => table.rawStatus !== 'inactive');
  const readyOrders = orders.filter((order) => order.rawStatus === 'ready');
  const customerCalls = tables.filter((table) => table.rawStatus === 'need_waiter');
  const waitersStats = [
    { label: 'Active Tables', value: String(activeTables.length), hint: `${activeTables.filter((table) => table.rawStatus !== 'available').length} occupied now`, tone: 'active', icon: UsersRound },
    { label: 'Ready to Serve', value: String(readyOrders.length), hint: 'Live kitchen pass', tone: 'ready', icon: CheckCircle2 },
    { label: 'Customer Calls', value: String(customerCalls.length), hint: 'Needs response', tone: 'call', icon: Bell },
  ];
  const serviceOrders = orders.filter((order) => order.rawStatus && ['pending', 'accepted', 'preparing', 'ready', 'served', 'waiting_payment'].includes(order.rawStatus));
  const requests = [
    ...customerCalls.map((table) => ({ table: table.code, text: `${table.name} requested waiter`, time: 'Now', tone: 'call' as ServiceTone, priority: 'High' })),
    ...readyOrders.slice(0, 3).map((order) => ({ table: order.table, text: `${order.name} ready to serve`, time: order.time, tone: 'ready' as ServiceTone, priority: 'Serve' })),
    ...orders.filter((order) => order.rawStatus === 'waiting_payment').slice(0, 2).map((order) => ({ table: order.table, text: `${order.name} requested bill`, time: order.time, tone: 'payment' as ServiceTone, priority: 'Bill' })),
  ];

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Waiters Station" subtitle="Handle table service, ready orders, and customer calls." />
        <div className="cashier-shift"><span>Floor</span><strong>Main Area - Evening</strong></div>
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
              <div><h2>Table Status</h2><p>Monitor dine-in tables and service progress</p></div>
              <button type="button"><RefreshCw aria-hidden="true" />Refresh</button>
            </div>
            <div className="waiters-zone-tabs">
              <button className="active" type="button">All Area</button>
              <button type="button">Indoor</button>
              <button type="button">Outdoor</button>
              <button type="button">Counter</button>
            </div>
            <div className="table-status-grid">
              {tables.map((table) => {
                const status = tableStatusCopy[table.rawStatus ?? 'available'];
                const linkedOrder = orders.find((order) => order.id === table.currentOrderId || order.table === table.code);
                return (
                  <button className={`table-status-card ${status.tone}`} type="button" key={table.id ?? table.code}>
                    <div className="table-card-head">
                      <span className="table-code">{table.code}</span>
                      <span className="table-state">{status.label}</span>
                    </div>
                    <div className="table-card-body">
                      <strong>{table.name}</strong>
                      <small><MapPin aria-hidden="true" />{table.seats} seats - {table.area}</small>
                    </div>
                    <div className="table-card-foot">
                      <span><Clock3 aria-hidden="true" />{linkedOrder?.name ?? status.eta}</span>
                      <em>{status.tone === 'ready' ? 'Serve' : status.tone === 'call' ? 'Handle' : 'View'}</em>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="waiters-panel">
            <div className="cashier-panel-head">
              <div><h2>Customer Requests</h2><p>Quick notes from QR table ordering and floor calls</p></div>
              <button type="button"><Plus aria-hidden="true" />Add Note</button>
            </div>
            <div className="waiter-request-list">
              {requests.length ? requests.map((request) => (
                <article className={`waiter-request ${request.tone}`} key={`${request.table}-${request.text}`}>
                  <span className="request-table">{request.table}</span>
                  <div><strong>{request.text}</strong><small>{request.time}</small></div>
                  <em>{request.priority}</em>
                  <button type="button">Handle</button>
                </article>
              )) : <p className="empty-state">No customer requests right now.</p>}
            </div>
          </section>
        </section>

        <aside className="service-queue">
          <div className="cashier-panel-head">
            <div><h2>Service Queue</h2><p>Orders that need waiter action</p></div>
          </div>
          <div className="service-queue-strip">
            <span><b>{readyOrders.length}</b> ready</span>
            <span><b>{customerCalls.length}</b> calls</span>
            <span><b>{serviceOrders.length}</b> active</span>
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
                  <p>{order.rawStatus ? waiterStatusHint[order.rawStatus] : 'Needs waiter/order desk action.'}</p>
                  <div className="service-meta">
                    <span>{order.rawStatus === 'ready' ? 'Priority' : order.status}</span>
                    <b>{order.time}</b>
                  </div>
                  <div className="service-actions">
                    <button type="button" disabled={!action} onClick={() => action && onUpdateStatus?.(order.id, action.status)}>{action?.label ?? 'Details'}</button>
                    <button type="button">Details</button>
                  </div>
                </article>
              );
            })}
            {serviceOrders.length === 0 && <p className="empty-state">No waiter actions right now.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}

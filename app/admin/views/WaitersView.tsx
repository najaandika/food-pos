'use client';

import { Bell, CheckCircle2, Clock3, MapPin, Plus, RefreshCw, UsersRound } from 'lucide-react';

import { AdminTitle, orders as fallbackOrders } from '..';
import type { AdminOrder } from '../runtime-data';

export function WaitersView({ orders = fallbackOrders }: { orders?: AdminOrder[] }) {
  const tables = [
    { code: 'A1', area: 'Window', status: 'Available', tone: 'available', guests: 0, eta: 'Open' },
    { code: 'A4', area: 'Indoor', status: 'Ready', tone: 'ready', guests: 4, eta: 'Serve now' },
    { code: 'B2', area: 'Bar', status: 'Preparing', tone: 'preparing', guests: 2, eta: '8 min' },
    { code: 'B7', area: 'Outdoor', status: 'Need Waiter', tone: 'call', guests: 3, eta: '2 min' },
    { code: 'C2', area: 'Terrace', status: 'Waiting Payment', tone: 'payment', guests: 2, eta: 'Bill ready' },
    { code: 'TA', area: 'Counter', status: 'Takeaway', tone: 'takeaway', guests: 1, eta: 'Pickup' },
  ];
  const waitersStats = [
    { label: 'Active Tables', value: '12', hint: '7 occupied now', tone: 'active', icon: UsersRound },
    { label: 'Ready to Serve', value: '5', hint: 'Avg wait 3 min', tone: 'ready', icon: CheckCircle2 },
    { label: 'Customer Calls', value: '2', hint: 'Needs response', tone: 'call', icon: Bell },
  ];
  const requests = [
    { table: 'B7', text: 'Need extra napkins', time: '1 min ago', tone: 'call', priority: 'High' },
    { table: 'A4', text: 'Ask for less ice', time: '3 min ago', tone: 'ready', priority: 'Serve' },
    { table: 'C2', text: 'Ready for payment', time: '5 min ago', tone: 'payment', priority: 'Bill' },
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
              {tables.map((table) => (
                <button className={`table-status-card ${table.tone}`} type="button" key={table.code}>
                  <div className="table-card-head">
                    <span className="table-code">{table.code}</span>
                    <span className="table-state">{table.status}</span>
                  </div>
                  <div className="table-card-body">
                    <strong>{table.area}</strong>
                    <small><MapPin aria-hidden="true" />{table.guests ? `${table.guests} guests` : 'Empty table'}</small>
                  </div>
                  <div className="table-card-foot">
                    <span><Clock3 aria-hidden="true" />{table.eta}</span>
                    <em>{table.tone === 'ready' ? 'Serve' : table.tone === 'call' ? 'Handle' : 'View'}</em>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="waiters-panel">
            <div className="cashier-panel-head">
              <div><h2>Customer Requests</h2><p>Quick notes from QR table ordering and floor calls</p></div>
              <button type="button"><Plus aria-hidden="true" />Add Note</button>
            </div>
            <div className="waiter-request-list">
              {requests.map((request) => (
                <article className={`waiter-request ${request.tone}`} key={`${request.table}-${request.text}`}>
                  <span className="request-table">{request.table}</span>
                  <div><strong>{request.text}</strong><small>{request.time}</small></div>
                  <em>{request.priority}</em>
                  <button type="button">Handle</button>
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="service-queue">
          <div className="cashier-panel-head">
            <div><h2>Service Queue</h2><p>Orders that need waiter action</p></div>
          </div>
          <div className="service-queue-strip">
            <span><b>5</b> ready</span>
            <span><b>2</b> calls</span>
            <span><b>8m</b> avg</span>
          </div>

          <div className="service-list">
            {orders.slice(0, 4).map((order, index) => (
              <article className={`service-card ${index === 0 ? 'urgent' : ''}`} key={`${order.name}-${order.table}`}>
                <div>
                  <span className={`table-pill ${order.tone}`}>{order.table}</span>
                  <div><strong>{order.name}</strong><small>{order.meta}</small></div>
                </div>
                <p>{index === 0 ? 'Ready to serve from kitchen pass.' : index === 1 ? 'Preparing in kitchen, check again soon.' : 'Waiting confirmation from cashier/order desk.'}</p>
                <div className="service-meta">
                  <span>{index === 0 ? 'Priority' : 'Normal'}</span>
                  <b>{index === 0 ? 'Now' : order.time}</b>
                </div>
                <div className="service-actions">
                  <button type="button">{index === 0 ? 'Serve Order' : 'Accept'}</button>
                  <button type="button">Details</button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}


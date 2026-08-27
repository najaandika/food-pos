'use client';

import { ListFilter, Search } from 'lucide-react';

import { AdminTitle, orders as fallbackOrders } from '..';
import type { PosOrderStatus } from '../../../lib/pos-types';
import type { AdminOrder } from '../runtime-data';

export function OrdersView({
  orders = fallbackOrders,
  onUpdateStatus,
}: {
  orders?: AdminOrder[];
  onUpdateStatus?: (orderId: number | undefined, status: PosOrderStatus) => void;
}) {
  const hasLiveOrders = orders.some((order) => order.rawStatus);
  const byStatus = (statuses: PosOrderStatus[]) => orders.filter((order) => order.rawStatus && statuses.includes(order.rawStatus));
  const columns = hasLiveOrders ? [
    { title: 'New', hint: 'Needs confirmation', items: byStatus(['pending', 'accepted']) },
    { title: 'Preparing', hint: 'Kitchen / bar process', items: byStatus(['preparing']) },
    { title: 'Ready', hint: 'Ready to serve', items: byStatus(['ready', 'served']) },
    { title: 'Waiting Payment', hint: 'Send to cashier', items: byStatus(['waiting_payment', 'paid']) },
  ] : [
    { title: 'New', hint: 'Needs confirmation', items: [orders[2], orders[3]].filter(Boolean) },
    { title: 'Preparing', hint: 'Kitchen / bar process', items: [orders[1]].filter(Boolean) },
    { title: 'Ready', hint: 'Ready to serve', items: [orders[0]].filter(Boolean) },
    { title: 'Waiting Payment', hint: 'Send to cashier', items: [orders[4], orders[5]].filter(Boolean) },
  ];
  const selectedOrder = orders[0];

  return (
    <section className="app-view active">
      <header className="topbar compact orders-topbar">
        <AdminTitle title="Orders" subtitle="Track dine-in, takeaway, and QR orders in progress." />
        <span className="date-label">Sunday, 23 August 2026</span>
      </header>
      <div className="orders-toolbar">
        <div className="tabs" role="tablist"><button className="active" type="button">All</button><button type="button">QR</button><button type="button">Dine In</button><button type="button">Takeaway</button><button type="button">Unpaid</button></div>
        <div className="tools-line"><button className="icon-btn" type="button" aria-label="Filter orders"><ListFilter aria-hidden="true" /></button><label className="search-wrap wide"><input type="search" placeholder="Search a name, order, or etc" /><Search aria-hidden="true" /></label></div>
      </div>
      <div className="orders-board-layout">
        <section className="orders-kanban">
          {columns.map((column) => (
            <div className="kanban-column" key={column.title}>
              <div className="kanban-head">
                <div><h2>{column.title}</h2><p>{column.hint}</p></div>
                <span>{column.items.length}</span>
              </div>
              <div className="kanban-list">
                {column.items.map((order, index) => (
                  <article className={`kanban-card ${column.title === 'Ready' ? 'highlight' : ''}`} key={`${column.title}-${order.name}`}>
                    <div className="kanban-card-top">
                      <span className={`table-pill ${order.tone}`}>{order.table}</span>
                      <div><strong>{order.name}</strong><small>{order.meta}</small></div>
                    </div>
                    <div className="kanban-meta">
                      <span>{index % 2 === 0 ? 'QR Order' : 'Manual'}</span>
                      <b>{order.time}</b>
                    </div>
                    <div className="kanban-items">
                      {order.items.slice(0, 2).map(([name, qty]) => <p key={name}><span>{name}</span><b>x{qty}</b></p>)}
                      {order.items.length > 2 && <em>+{order.items.length - 2} more items</em>}
                    </div>
                    <div className="kanban-card-bottom">
                      <strong>{order.total}</strong>
                      <button type="button" onClick={() => onUpdateStatus?.(order.id, column.title === 'Ready' ? 'served' : column.title === 'Waiting Payment' ? 'paid' : 'preparing')}>{column.title === 'Waiting Payment' ? 'Pay' : column.title === 'Ready' ? 'Serve' : 'Update'}</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>

        <aside className="order-detail-panel">
          <div className="cashier-detail-top">
            <div>
              <span className="mini-status ready">Selected Order</span>
              <h2>{selectedOrder?.name}</h2>
              <p>{selectedOrder?.meta} - {selectedOrder?.time}</p>
            </div>
            <span className="table-pill teal">{selectedOrder?.table}</span>
          </div>
          <div className="order-source-box">
            <span>Source</span>
            <strong>QR Table Ordering</strong>
            <p>Customer note: make the dish a bit spicy.</p>
          </div>
          <div className="cashier-items">
            {(selectedOrder?.items ?? []).map(([name, qty, price]) => (
              <div key={name}><span>{name}</span><b>x{qty}</b><strong>{price}</strong></div>
            ))}
          </div>
          <div className="cashier-actions">
            <button type="button">Print</button>
            <button type="button" onClick={() => onUpdateStatus?.(selectedOrder?.id, 'ready')}>Mark Ready</button>
          </div>
        </aside>
      </div>
    </section>
  );
}


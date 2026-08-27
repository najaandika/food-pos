'use client';

import { Banknote, CreditCard, ListFilter, QrCode, Search } from 'lucide-react';

import { AdminTitle, orders as fallbackOrders } from '..';
import type { AdminOrder } from '../runtime-data';

export function CashierView({ orders = fallbackOrders, onMarkPaid }: { orders?: AdminOrder[]; onMarkPaid?: (orderId: number | undefined) => void }) {
  const selectedOrder = orders[0];
  const subtotal = selectedOrder?.total ?? '$73.79';
  const tax = '$3.65';
  const cashierStats = [
    { label: 'Unpaid Bills', value: '8', hint: '5 ready to close' },
    { label: 'Cash In Drawer', value: 'Rp 2.4M', hint: 'Evening shift' },
    { label: 'Paid Today', value: 'Rp 6.12M', hint: '42 transactions' },
  ];

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Cashier Desk" subtitle="Confirm bills, choose payment method, and close transactions." />
        <div className="cashier-shift"><span>Shift</span><strong>Evening - Gladina</strong></div>
      </header>

      <div className="cashier-layout">
        <section className="cashier-feed">
          <div className="cashier-summary">
            {cashierStats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.hint}</small>
              </article>
            ))}
          </div>

          <div className="cashier-panel">
            <div className="cashier-panel-head">
              <div><h2>Payment Queue</h2><p>QR and manual orders waiting for cashier action</p></div>
              <button type="button"><ListFilter aria-hidden="true" />Filter</button>
            </div>
            <div className="cashier-toolbar">
              <div className="owner-filter-tabs">
                <button className="active" type="button">All Bills</button>
                <button type="button">Ready</button>
                <button type="button">QR Order</button>
                <button type="button">Takeaway</button>
              </div>
              <label className="search-wrap"><input type="search" placeholder="Search bill or table" /><Search aria-hidden="true" /></label>
            </div>

            <div className="cashier-order-list">
              {orders.slice(0, 5).map((order, index) => (
                <button className={`cashier-order-row ${index === 0 ? 'active' : ''}`} type="button" key={`${order.table}-${order.name}`}>
                  <span className={`table-pill ${order.tone}`}>{order.table}</span>
                  <div>
                    <strong>{order.name}</strong>
                    <small>{order.meta}</small>
                    <i>{index % 2 === 0 ? 'QR Table Ordering' : 'Manual Order'}</i>
                  </div>
                  <em className={order.statusTone}>{order.status === 'Completed' ? 'Waiting Payment' : order.status}</em>
                  <span className="cashier-row-time">{order.time}</span>
                  <b>{order.total}</b>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="cashier-detail">
          <div className="cashier-detail-top">
            <div className="cashier-customer-head">
              <span className="cashier-ticket-mark">#925</span>
              <div>
                <span className="mini-status ready">Ready to Pay</span>
                <h2>{selectedOrder?.name}</h2>
                <p>{selectedOrder?.meta} - {selectedOrder?.time}</p>
              </div>
            </div>
            <span className="cashier-table-badge"><small>Table</small><strong>{selectedOrder?.table}</strong></span>
          </div>

          <div className="payment-due-card">
            <span>Amount Due</span>
            <strong>{selectedOrder?.total}</strong>
            <small>Includes tax and service rounding</small>
          </div>

          <div className="cashier-note-grid">
            <article><span>Source</span><strong>QR Table Ordering</strong></article>
            <article><span>Payment Status</span><strong>Unpaid</strong></article>
          </div>

          <div className="cashier-section-title">
            <h3>Bill Items</h3>
            <span>{selectedOrder?.items.length ?? 0} items</span>
          </div>

          <div className="cashier-items">
            {(selectedOrder?.items ?? []).map(([name, qty, price]) => (
              <div key={name}>
                <span>{name}</span>
                <b>x{qty}</b>
                <strong>{price}</strong>
              </div>
            ))}
          </div>

          <div className="cashier-bill">
            <p><span>Subtotal</span><strong>{subtotal}</strong></p>
            <p><span>Tax (5%)</span><strong>{tax}</strong></p>
            <p><span>Total</span><strong>{selectedOrder?.total}</strong></p>
          </div>

          <div className="payment-methods">
            <h3>Payment Method</h3>
            <div>
              <button className="active" type="button"><Banknote aria-hidden="true" />Cash</button>
              <button type="button"><QrCode aria-hidden="true" />QRIS</button>
              <button type="button"><CreditCard aria-hidden="true" />Card</button>
            </div>
          </div>

          <div className="cashier-tendered">
            <p><span>Cash Received</span><strong>$100.00</strong></p>
            <p><span>Change</span><strong>$12.66</strong></p>
          </div>

          <div className="cashier-actions">
            <button type="button">Print Bill</button>
            <button type="button" onClick={() => onMarkPaid?.(selectedOrder?.id)}>Mark as Paid</button>
          </div>
        </aside>
      </div>
    </section>
  );
}


'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banknote, CreditCard, ListFilter, QrCode, Search } from 'lucide-react';

import { AdminTitle, orders as fallbackOrders } from '..';
import { formatRupiah } from '../../lib/format';
import type { AdminOrder } from '../runtime-data';
import type { PosSettings } from '../../../lib/pos-types';

import { roleLabel, type AuthUser } from '../auth';

type PaymentMethod = 'cash' | 'qris' | 'transfer';
type CashierFilter = 'all' | 'ready' | 'qr' | 'takeaway';

const payableStatuses = ['ready', 'served', 'waiting_payment'] as const;

function formatSource(source?: AdminOrder['source']) {
  return source === 'manual' ? 'Manual Order' : 'QR Table Ordering';
}

export function CashierView({
  orders = fallbackOrders,
  settings,
  onMarkPaid,
  user,
  onLogout,
}: {
  orders?: AdminOrder[];
  settings?: PosSettings;
  onMarkPaid?: (id: number, method?: PaymentMethod) => void;
  user?: AuthUser;
  onLogout?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | undefined>(orders[0]?.id);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CashierFilter>('all');

  const paymentQueue = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const isPayable = order.rawStatus ? payableStatuses.includes(order.rawStatus as (typeof payableStatuses)[number]) : true;
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'ready' && ['ready', 'served', 'waiting_payment'].includes(order.rawStatus ?? '')) ||
        (activeFilter === 'qr' && order.source === 'qr') ||
        (activeFilter === 'takeaway' && order.type === 'takeaway');
      const matchesQuery =
        !normalizedQuery ||
        order.name.toLowerCase().includes(normalizedQuery) ||
        order.table.toLowerCase().includes(normalizedQuery) ||
        order.meta.toLowerCase().includes(normalizedQuery);
      return isPayable && matchesFilter && matchesQuery;
    });
  }, [activeFilter, orders, query]);

  const selectedOrder = paymentQueue.find((order) => order.id === selectedId) ?? paymentQueue[0] ?? orders[0];
  const selectedPayable = selectedOrder?.rawStatus ? payableStatuses.includes(selectedOrder.rawStatus as (typeof payableStatuses)[number]) : false;
  const subtotal = selectedOrder?.rawSubtotal ?? selectedOrder?.rawTotal ?? 0;
  const taxRate = settings?.tax.taxRate ?? 5;
  const serviceRate = settings?.tax.serviceRate ?? 0;
  const tax = selectedOrder?.rawTax ?? Math.round(subtotal * (taxRate / 100));
  const serviceCharge = selectedOrder?.rawServiceCharge ?? Math.round(subtotal * (serviceRate / 100));
  const total = selectedOrder?.rawTotal ?? subtotal + tax + serviceCharge;
  const cashReceived = method === 'cash' ? Math.ceil(total / 50000) * 50000 : total;
  const change = Math.max(0, cashReceived - total);
  const paymentOptions = useMemo(() => ([
    { key: 'cash' as const, label: 'Cash', icon: Banknote, enabled: settings?.payments.cash ?? true },
    { key: 'qris' as const, label: 'QRIS', icon: QrCode, enabled: settings?.payments.qris ?? true },
    { key: 'transfer' as const, label: 'Transfer', icon: CreditCard, enabled: settings?.payments.transfer ?? false },
  ]).filter((option) => option.enabled), [settings]);
  const paidToday = orders.filter((order) => order.rawStatus === 'paid');
  const cashierStats = [
    { label: 'Unpaid Bills', value: String(paymentQueue.length), hint: `${paymentQueue.filter((order) => order.rawStatus === 'waiting_payment').length} ready to close` },
    { label: 'Cash In Drawer', value: 'Rp 2.4M', hint: 'Evening shift' },
    { label: 'Paid Today', value: formatRupiah(paidToday.reduce((sum, order) => sum + (order.rawTotal ?? 0), 0)), hint: `${paidToday.length} transactions` },
  ];

  useEffect(() => {
    if (!paymentOptions.some((option) => option.key === method)) {
      setMethod(paymentOptions[0]?.key ?? 'cash');
    }
  }, [method, paymentOptions]);

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Cashier Desk" subtitle="Confirm bills, choose payment method, and close transactions." user={user} onLogout={onLogout} />
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
                {[
                  ['all', 'All Bills'],
                  ['ready', 'Ready'],
                  ['qr', 'QR Order'],
                  ['takeaway', 'Takeaway'],
                ].map(([value, label]) => (
                  <button className={activeFilter === value ? 'active' : ''} type="button" key={value} onClick={() => setActiveFilter(value as CashierFilter)}>
                    {label}
                  </button>
                ))}
              </div>
              <label className="search-wrap">
                <input type="search" placeholder="Search bill or table" value={query} onChange={(event) => setQuery(event.target.value)} />
                <Search aria-hidden="true" />
              </label>
            </div>

            <div className="cashier-order-list">
              {paymentQueue.map((order) => (
                <button className={`cashier-order-row ${order.id === selectedOrder?.id ? 'active' : ''}`} type="button" key={order.id ?? `${order.table}-${order.name}`} onClick={() => setSelectedId(order.id)}>
                  <span className={`table-pill ${order.tone}`}>{order.table}</span>
                  <div>
                    <strong>{order.name}</strong>
                    <small>{order.meta}</small>
                    <i>{formatSource(order.source)}</i>
                  </div>
                  <em className={order.statusTone}>{order.status}</em>
                  <span className="cashier-row-time">{order.time}</span>
                  <b>{order.total}</b>
                </button>
              ))}
              {paymentQueue.length === 0 && <p className="empty-state">No bills match this queue.</p>}
            </div>
          </div>
        </section>

        <aside className="cashier-detail">
          <div className="cashier-detail-top">
            <div className="cashier-customer-head">
              <span className="cashier-ticket-mark">{selectedOrder?.orderNumber?.replace('BB-', '#') ?? '#925'}</span>
              <div>
                <span className="mini-status ready">Ready to Pay</span>
                <h2>{selectedOrder?.name ?? 'No bill selected'}</h2>
                <p>{selectedOrder?.meta} - {selectedOrder?.time}</p>
              </div>
            </div>
            <span className="cashier-table-badge"><small>Table</small><strong>{selectedOrder?.table ?? '-'}</strong></span>
          </div>

          <div className="payment-due-card">
            <span>Amount Due</span>
            <strong>{formatRupiah(total)}</strong>
            <small>Includes tax and service rounding</small>
          </div>

          <div className="cashier-note-grid">
            <article><span>Source</span><strong>{formatSource(selectedOrder?.source)}</strong></article>
            <article><span>Payment Status</span><strong>{selectedOrder?.rawStatus === 'paid' ? 'Paid' : 'Unpaid'}</strong></article>
          </div>

          <div className="cashier-section-title">
            <h3>Bill Items</h3>
            <span>{selectedOrder?.items.length ?? 0} items</span>
          </div>

          <div className="cashier-items">
            {(selectedOrder?.items ?? []).map(([name, qty, price], index) => (
              <div key={`${selectedOrder?.id ?? selectedOrder?.orderNumber}-${name}-${index}`}>
                <span>{name}</span>
                <b>x{qty}</b>
                <strong>{price}</strong>
              </div>
            ))}
          </div>

          <div className="cashier-bill">
            <p><span>Subtotal</span><strong>{formatRupiah(subtotal)}</strong></p>
            <p><span>Tax ({taxRate}%)</span><strong>{formatRupiah(tax)}</strong></p>
            {(serviceRate > 0 || serviceCharge > 0) && <p><span>Service ({serviceRate}%)</span><strong>{formatRupiah(serviceCharge)}</strong></p>}
            <p><span>Total</span><strong>{formatRupiah(total)}</strong></p>
          </div>

          <div className="payment-methods">
            <h3>Payment Method</h3>
            <div>
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button className={method === option.key ? 'active' : ''} type="button" key={option.key} onClick={() => setMethod(option.key)}>
                    <Icon aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cashier-tendered">
            <p><span>{method === 'cash' ? 'Cash Received' : 'Tendered'}</span><strong>{formatRupiah(cashReceived)}</strong></p>
            <p><span>Change</span><strong>{formatRupiah(change)}</strong></p>
          </div>

          <div className="cashier-actions">
            <button type="button">Print Bill</button>
            <button type="button" disabled={!selectedOrder?.id || !selectedPayable || paymentOptions.length === 0} onClick={() => selectedOrder?.id && onMarkPaid?.(selectedOrder.id, method)}>Mark as Paid</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

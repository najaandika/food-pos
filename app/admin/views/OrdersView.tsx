'use client';

import './OrdersView.css';

import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { ListFilter, Search } from 'lucide-react';

import { AdminTitle, orders as fallbackOrders } from '..';
import type { PosOrderStatus, PosOrderType, UserRole } from '../../../lib/pos-types';
import type { AdminOrder } from '../runtime-data';

const statusLabels: Record<PosOrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  waiting_payment: 'Waiting Payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

const nextStatus: Partial<Record<PosOrderStatus, { label: string; value: PosOrderStatus }>> = {
  pending: { label: 'Accept', value: 'accepted' },
  accepted: { label: 'Kitchen', value: 'preparing' },
  preparing: { label: 'Ready', value: 'ready' },
  ready: { label: 'Serve', value: 'served' },
  served: { label: 'Send Bill', value: 'waiting_payment' },
};

const roleNextStatus: Record<UserRole, Partial<Record<PosOrderStatus, { label: string; value: PosOrderStatus }>>> = {
  owner: nextStatus,
  kasir: {
    served: { label: 'Send Bill', value: 'waiting_payment' },
  },
  waiters: {
    pending: { label: 'Accept', value: 'accepted' },
    accepted: { label: 'Kitchen', value: 'preparing' },
    preparing: { label: 'Ready', value: 'ready' },
    ready: { label: 'Serve', value: 'served' },
    served: { label: 'Send Bill', value: 'waiting_payment' },
  },
};

const statusStage: Record<PosOrderStatus, { label: string; tone: string; helper: string }> = {
  pending: { label: 'New order', tone: 'new', helper: 'Needs staff confirmation' },
  accepted: { label: 'Accepted', tone: 'kitchen', helper: 'Send to kitchen or bar' },
  preparing: { label: 'In kitchen', tone: 'kitchen', helper: 'Preparing now' },
  ready: { label: 'Ready', tone: 'ready', helper: 'Serve to table' },
  served: { label: 'Served', tone: 'served', helper: 'Ask or send bill' },
  waiting_payment: { label: 'Billing', tone: 'billing', helper: 'Cashier action needed' },
  paid: { label: 'Paid', tone: 'paid', helper: 'Closed transaction' },
  cancelled: { label: 'Cancelled', tone: 'cancelled', helper: 'No action needed' },
};

const workflowSteps: Array<{ label: string; statuses: PosOrderStatus[] }> = [
  { label: 'Accept', statuses: ['pending'] },
  { label: 'Kitchen', statuses: ['accepted', 'preparing'] },
  { label: 'Ready', statuses: ['ready'] },
  { label: 'Serve', statuses: ['served'] },
  { label: 'Bill', statuses: ['waiting_payment', 'paid'] },
];

type OrderFilter = 'all' | 'qr' | 'dine_in' | 'takeaway' | 'unpaid';

function formatSource(source?: AdminOrder['source']) {
  return source === 'manual' ? 'Manual Order' : 'QR Table Ordering';
}

export function OrdersView({
  role = 'owner',
  orders = fallbackOrders,
  onUpdateStatus,
}: {
  role?: UserRole;
  orders?: AdminOrder[];
  onUpdateStatus?: (orderId: number | undefined, status: PosOrderStatus) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(orders[0]?.id);

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const rawType = order.type as PosOrderType | undefined;
      const isUnpaid = order.rawStatus && !['paid', 'cancelled'].includes(order.rawStatus);
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'qr' && order.source === 'qr') ||
        (activeFilter === 'dine_in' && rawType === 'dine_in') ||
        (activeFilter === 'takeaway' && rawType === 'takeaway') ||
        (activeFilter === 'unpaid' && Boolean(isUnpaid));
      const matchesQuery =
        !normalizedQuery ||
        order.name.toLowerCase().includes(normalizedQuery) ||
        order.table.toLowerCase().includes(normalizedQuery) ||
        order.meta.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, orders, query]);

  const byStatus = (statuses: PosOrderStatus[]) => visibleOrders.filter((order) => order.rawStatus && statuses.includes(order.rawStatus));
  const selectedOrder = orders.find((order) => order.id === selectedId) ?? visibleOrders[0] ?? orders[0];
  const baseColumns = [
    { title: 'New', hint: 'Accept incoming QR/manual orders', items: byStatus(['pending']) },
    { title: 'Kitchen', hint: 'Accepted and cooking tickets', items: byStatus(['accepted', 'preparing']) },
    { title: 'Ready', hint: 'Ready to serve', items: byStatus(['ready']) },
    { title: 'Served', hint: 'Served, waiting for bill request', items: byStatus(['served']) },
    { title: 'Billing', hint: 'Send to cashier', items: byStatus(['waiting_payment']) },
  ];
  const columns = role === 'waiters'
    ? baseColumns.filter((column) => column.title !== 'Billing')
    : role === 'kasir'
      ? baseColumns.filter((column) => ['Served', 'Billing'].includes(column.title))
      : baseColumns;

  const moveOrder = (order: AdminOrder) => {
    const action = order.rawStatus ? roleNextStatus[role][order.rawStatus] : undefined;
    if (!action) return;
    onUpdateStatus?.(order.id, action.value);
  };

  return (
    <section className="app-view active">
      <header className="topbar compact orders-topbar">
        <AdminTitle title="Orders" subtitle="Track dine-in, takeaway, and QR orders in progress." />
        <span className="date-label">Sunday, 23 August 2026</span>
      </header>
      <div className="orders-toolbar">
        <div className="tabs" role="tablist">
          {[
            ['all', 'All'],
            ['qr', 'QR'],
            ['dine_in', 'Dine In'],
            ['takeaway', 'Takeaway'],
            ['unpaid', 'Unpaid'],
          ].map(([value, label]) => (
            <button className={activeFilter === value ? 'active' : ''} type="button" key={value} onClick={() => setActiveFilter(value as OrderFilter)}>
              {label}
            </button>
          ))}
        </div>
        <div className="tools-line">
          <button className="icon-btn" type="button" aria-label="Filter orders"><ListFilter aria-hidden="true" /></button>
          <label className="search-wrap wide">
            <input type="search" placeholder="Search a name, order, or etc" value={query} onChange={(event) => setQuery(event.target.value)} />
            <Search aria-hidden="true" />
          </label>
        </div>
      </div>
      <div className={`orders-board-layout orders-board-${role}`}>
        <section className="orders-kanban" style={{ '--order-columns': columns.length } as CSSProperties}>
          {columns.map((column) => (
            <div className="kanban-column" key={column.title}>
              <div className="kanban-head">
                <div><h2>{column.title}</h2><p>{column.hint}</p></div>
                <span>{column.items.length}</span>
              </div>
              <div className="kanban-list">
                {column.items.map((order) => {
                  const action = order.rawStatus ? roleNextStatus[role][order.rawStatus] : undefined;
                  const stage = order.rawStatus ? statusStage[order.rawStatus] : undefined;
                  return (
                    <article className={`kanban-card ${order.id === selectedOrder?.id ? 'highlight' : ''}`} key={order.id ?? `${column.title}-${order.name}`} onClick={() => setSelectedId(order.id)}>
                      <div className="kanban-card-top">
                        <span className={`table-pill ${order.tone}`}>{order.table}</span>
                        <div><strong>{order.name}</strong><small>{order.meta}</small></div>
                      </div>
                      {stage && <span className={`workflow-chip ${stage.tone}`}>{stage.label}</span>}
                      <div className="kanban-meta">
                        <span>{formatSource(order.source)}</span>
                        <b>{order.time}</b>
                      </div>
                      <div className="kanban-items">
                        {order.items.slice(0, 2).map(([name, qty], index) => <p key={`${order.id ?? order.orderNumber}-${name}-${index}`}><span>{name}</span><b>x{qty}</b></p>)}
                        {order.items.length > 2 && <em>+{order.items.length - 2} more items</em>}
                      </div>
                      <div className="kanban-card-bottom">
                        <strong>{order.total}</strong>
                        <button type="button" disabled={!action} onClick={(event) => { event.stopPropagation(); moveOrder(order); }}>
                          {action?.label ?? (order.rawStatus ? statusLabels[order.rawStatus] : 'Update')}
                        </button>
                      </div>
                    </article>
                  );
                })}
                {column.items.length === 0 && (
                  <div className="kanban-empty">
                    <strong>No {column.title.toLowerCase()} tickets</strong>
                    <span>New orders will appear here automatically.</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>

        <aside className="order-detail-panel">
          <div className="cashier-detail-top">
            <div>
              <span className="mini-status ready">Selected Order</span>
              <h2>{selectedOrder?.name ?? 'No order selected'}</h2>
              <p>{selectedOrder?.meta} - {selectedOrder?.time}</p>
            </div>
            <span className={`table-pill ${selectedOrder?.tone ?? 'teal'}`}>{selectedOrder?.table ?? '-'}</span>
          </div>
          {selectedOrder?.rawStatus && (
            <div className="workflow-progress" aria-label="Order workflow">
              {workflowSteps.map((step) => {
                const currentIndex = workflowSteps.findIndex((item) => item.statuses.includes(selectedOrder.rawStatus as PosOrderStatus));
                const stepIndex = workflowSteps.findIndex((item) => item.label === step.label);
                return (
                  <span className={stepIndex <= currentIndex ? 'active' : ''} key={step.label}>
                    <b>{stepIndex + 1}</b>
                    {step.label}
                  </span>
                );
              })}
            </div>
          )}
          <div className="order-source-box">
            <span>Source</span>
            <strong>{formatSource(selectedOrder?.source)}</strong>
            <p>{selectedOrder?.notes ?? 'No customer note for this order.'}</p>
          </div>
          <div className="cashier-items">
            {(selectedOrder?.items ?? []).map(([name, qty, price], index) => (
              <div key={`${selectedOrder?.id ?? selectedOrder?.orderNumber}-${name}-${index}`}><span>{name}</span><b>x{qty}</b><strong>{price}</strong></div>
            ))}
          </div>
          <div className="cashier-actions">
            <button type="button">Print</button>
            <button type="button" disabled={!selectedOrder?.rawStatus || !roleNextStatus[role][selectedOrder.rawStatus]} onClick={() => selectedOrder && moveOrder(selectedOrder)}>
              {selectedOrder?.rawStatus ? roleNextStatus[role][selectedOrder.rawStatus]?.label ?? statusLabels[selectedOrder.rawStatus] : 'Update'}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

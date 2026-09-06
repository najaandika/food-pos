'use client';

import { useMemo, useState } from 'react';
import { ListFilter, Search } from 'lucide-react';

import { AdminTitle, orders as fallbackOrders } from '..';
import type { PosOrderStatus, PosOrderType, UserRole } from '@/lib/pos-types';
import type { AdminOrder } from '../runtime-data';
import { OrderDetail } from './orders/OrderDetail';
import { OrdersBoard } from './orders/OrdersBoard';

const nextStatus: Partial<Record<PosOrderStatus, { label: string; value: PosOrderStatus }>> = {
  pending: { label: 'Accept', value: 'accepted' },
  accepted: { label: 'Kitchen', value: 'preparing' },
  preparing: { label: 'Ready', value: 'ready' },
  ready: { label: 'Serve', value: 'served' },
  served: { label: 'Send Bill', value: 'waiting_payment' },
};

const roleNextStatus: Record<UserRole, Partial<Record<PosOrderStatus, { label: string; value: PosOrderStatus }>>> = {
  owner: nextStatus,
  kasir: { served: { label: 'Send Bill', value: 'waiting_payment' } },
  waiters: {
    pending: { label: 'Accept', value: 'accepted' },
    accepted: { label: 'Kitchen', value: 'preparing' },
    preparing: { label: 'Ready', value: 'ready' },
    ready: { label: 'Serve', value: 'served' },
    served: { label: 'Send Bill', value: 'waiting_payment' },
  },
};

type OrderFilter = 'all' | 'qr' | 'dine_in' | 'takeaway' | 'unpaid';

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
  const columns =
    role === 'waiters'
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
        <div className="admin-tabs" role="tablist">
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
          <button className="icon-btn" type="button" aria-label="Filter orders">
            <ListFilter aria-hidden="true" />
          </button>
          <label className="admin-search-wrap wide">
            <input type="search" placeholder="Search a name, order, or etc" value={query} onChange={(event) => setQuery(event.target.value)} />
            <Search aria-hidden="true" />
          </label>
        </div>
      </div>
      <div className={`orders-board-layout orders-board-${role}`}>
        <OrdersBoard columns={columns} role={role} selectedOrder={selectedOrder} onSelect={setSelectedId} onMove={moveOrder} roleNextStatus={roleNextStatus} />
        <OrderDetail selectedOrder={selectedOrder} role={role} onMove={moveOrder} roleNextStatus={roleNextStatus} />
      </div>
    </section>
  );
}

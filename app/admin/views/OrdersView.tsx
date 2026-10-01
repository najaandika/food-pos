'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

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

import { useLocale } from '../i18n-context';

export function OrdersView({
  role = 'owner',
  orders = fallbackOrders,
  onUpdateStatus,
}: {
  role?: UserRole;
  orders?: AdminOrder[];
  onUpdateStatus?: (orderId: number | undefined, status: PosOrderStatus) => void;
}) {
  const { locale, t } = useLocale();
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
  const selectedOrder = visibleOrders.find((order) => order.id === selectedId) ?? visibleOrders[0];
  const baseColumns = [
    { title: t('orders.new'), hint: t('orders.acceptIncoming'), items: byStatus(['pending']) },
    { title: t('orders.kitchen'), hint: t('orders.cookingTickets'), items: byStatus(['accepted', 'preparing']) },
    { title: t('orders.ready'), hint: t('orders.readyToServe'), items: byStatus(['ready']) },
    { title: t('orders.served'), hint: t('orders.waitingBill'), items: byStatus(['served']) },
    { title: t('orders.billing'), hint: t('orders.sendToCashier'), items: byStatus(['waiting_payment']) },
  ];
  const columns =
    role === 'waiters'
      ? baseColumns.filter((column) => column.title !== t('orders.billing'))
      : role === 'kasir'
        ? baseColumns.filter((column) => [t('orders.served'), t('orders.billing')].includes(column.title))
        : baseColumns;

  const moveOrder = (order: AdminOrder) => {
    const action = order.rawStatus ? roleNextStatus[role][order.rawStatus] : undefined;
    if (!action) return;
    onUpdateStatus?.(order.id, action.value);
  };

  const filterTabs: Array<[OrderFilter, string]> = [
    ['all', t('orders.all')],
    ['qr', t('orders.qr')],
    ['dine_in', t('orders.dineIn')],
    ['takeaway', t('orders.takeaway')],
    ['unpaid', t('orders.unpaid')],
  ];

  return (
    <section className="app-view active">
      <header className="topbar compact orders-topbar">
        <AdminTitle title={t('orders.title')} subtitle={t('orders.subtitle')} />
        <span className="date-label">{new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'full' }).format(new Date())}</span>
      </header>
      <div className="orders-toolbar">
        <div className="admin-tabs" role="tablist">
          {filterTabs.map(([value, label]) => (
            <button className={activeFilter === value ? 'active' : ''} type="button" key={value} onClick={() => setActiveFilter(value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="tools-line">
          <label className="admin-search-wrap wide">
            <input type="search" placeholder={t('orders.searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)} />
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

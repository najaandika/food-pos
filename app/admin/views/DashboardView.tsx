'use client';

import {
  Bell,
  CreditCard,
  List,
  Plus,
  QrCode,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';

import { AdminTitle, dishes as fallbackDishes, orders as fallbackOrders } from '..';
import { getDashboardStats, type AdminDish, type AdminOrder } from '../runtime-data';
import type { UserRole } from '../../../lib/pos-types';
import type { View } from '../types';

export function DashboardView({
  role,
  dashboard,
  dishes = fallbackDishes,
  orders = fallbackOrders,
  onChangeView,
}: {
  role: UserRole;
  dashboard?: Parameters<typeof getDashboardStats>[0];
  dishes?: AdminDish[];
  orders?: AdminOrder[];
  onChangeView: (view: View) => void;
}) {
  const stats = getDashboardStats(dashboard);
  const statusRows = [
    { label: 'Pending', matches: ['Pending'], fallback: 0 },
    { label: 'Preparing', matches: ['Accepted', 'In Progress'], fallback: 0 },
    { label: 'Ready', matches: ['Ready'], fallback: 0 },
    { label: 'Waiting Payment', matches: ['Waiting Payment'], fallback: 0 },
  ].map((row) => ({
    ...row,
    value: orders.filter((order) => row.matches.includes(order.status)).length,
  }));
  const maxStatusCount = Math.max(1, ...statusRows.map((row) => row.value));
  const operationStats: Array<{
    label: string;
    value: string;
    note: string;
    tone: string;
    icon: LucideIcon;
  }> = [
    { label: 'Revenue Today', value: stats.revenue, note: '+8.4% from yesterday', tone: 'primary', icon: CreditCard },
    { label: 'Active Orders', value: String(stats.activeOrders), note: `${stats.waitingPayment} waiting payment`, tone: '', icon: ReceiptText },
    { label: 'QR Orders', value: String(stats.qrOrders), note: 'Table scan orders', tone: '', icon: QrCode },
    { label: 'Need Action', value: String(stats.needAction), note: 'ready/call waiter', tone: 'alert', icon: Bell },
  ];
  const quickActions = role === 'owner'
    ? [
        { label: 'Create Order', icon: Plus, action: () => onChangeView('menu'), primary: true },
        { label: 'Open Cashier', icon: CreditCard, action: () => onChangeView('cashier') },
        { label: 'Manage Menu', icon: List, action: () => onChangeView('owner-menu') },
        { label: 'Generate QR', icon: QrCode, action: () => onChangeView('owner-tables') },
      ]
    : role === 'kasir'
      ? [
          { label: 'Create Order', icon: Plus, action: () => onChangeView('menu'), primary: true },
          { label: 'POS Counter', icon: List, action: () => onChangeView('menu') },
          { label: 'Payment Queue', icon: CreditCard, action: () => onChangeView('cashier') },
          { label: 'Order Board', icon: ReceiptText, action: () => onChangeView('orders') },
        ]
      : [
          { label: 'Order Board', icon: ReceiptText, action: () => onChangeView('orders'), primary: true },
          { label: 'Waiters Station', icon: Bell, action: () => onChangeView('waiters') },
        ];

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Sales Overview" subtitle="Monitor today's performance and active orders." />
        <div className="date-label">Today, {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date())}</div>
      </header>
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <div className="dashboard-stats-grid">
            {operationStats.map((stat, index) => (
              <article className={`dashboard-metric ${stat.tone} ${index === 0 ? 'featured' : ''}`} key={stat.label}>
                <div className="metric-icon"><stat.icon aria-hidden="true" /></div>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.note}</small>
                {index === 0 && (
                  <div className="metric-spark" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="dashboard-ops-grid">
            <section className="ops-card">
              <div className="admin-section-head compact-head">
                <div><h2>Order Status</h2><p>Live operational split</p></div>
              </div>
              <div className="status-breakdown">
                {statusRows.map((row) => (
                  <p key={row.label}>
                    <span>{row.label}</span>
                    <b style={{ width: `${Math.max(8, (row.value / maxStatusCount) * 100)}%` }} />
                    <strong>{row.value}</strong>
                  </p>
                ))}
              </div>
            </section>

            <section className="ops-card">
              <div className="admin-section-head compact-head">
                <div><h2>Floor Activity</h2><p>Tables needing attention</p></div>
              </div>
              <div className="floor-mini-grid">
                <span className="ready">A4<small>Ready</small></span>
                <span className="warning">B2<small>Preparing</small></span>
                <span className="danger">B7<small>Call</small></span>
                <span>C2<small>Payment</small></span>
              </div>
            </section>
          </div>

          <section className="order-list-panel dashboard-recent">
            <div className="admin-section-head">
              <div><h2>Recent Orders</h2><p>Latest QR and manual orders</p></div>
              <button type="button" onClick={() => onChangeView('orders')}>View All</button>
            </div>
            <div className="order-feed">
              {orders.slice(0, 5).map((order, index) => (
                <article className="feed-row" key={order.id ?? order.orderNumber ?? `${order.table}-${order.name}-${index}`}>
                  <span className={`table-pill ${order.tone}`}>{order.table}</span>
                  <div><strong>{order.name}</strong><small>{order.items.length} Items</small></div>
                  <span className={`mini-status ${order.statusTone}`}>{order.status}</span>
                  <small>{order.status === 'Ready' ? 'Ready to serve' : 'Waiting for payment'}</small>
                  <button type="button" onClick={() => onChangeView('cashier')}>Pay Now <span>-&gt;</span></button>
                </article>
              ))}
            </div>
          </section>
        </div>
        <aside className="dashboard-side">
          <section className={`quick-actions-card quick-actions-${role}`}>
            <h2>Quick Actions</h2>
            <div className="quick-actions-grid">
              {quickActions.map((action) => (
                <button className={action.primary ? 'primary' : ''} type="button" key={action.label} onClick={action.action}>
                  <action.icon aria-hidden="true" />{action.label}
                </button>
              ))}
            </div>
          </section>
          <section className="side-panel">
            <div className="side-head">
              <h3>Popular Menu</h3>
              <button type="button" onClick={() => onChangeView(role === 'owner' ? 'owner-menu' : 'menu')}>View All</button>
            </div>
            <ol className="rank-list">
              {dishes.slice(0, 4).map((dish, index) => (
                <li key={dish.id ?? `${dish.name}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><Image src={dish.image} alt="" width={80} height={80} /><strong>{dish.name}</strong><small>{23 - index * 4} sold - Rp {(1.2 - index * 0.18).toFixed(1)}M</small></li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}

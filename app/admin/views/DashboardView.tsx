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

import { useLocale } from '../i18n-context';

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
  const { locale, t } = useLocale();
  const stats = getDashboardStats(dashboard);
  const statusRows = [
    { label: t('dashboard.pending'), matches: ['Pending'], fallback: 0 },
    { label: t('dashboard.preparing'), matches: ['Accepted', 'In Progress'], fallback: 0 },
    { label: t('dashboard.ready'), matches: ['Ready'], fallback: 0 },
    { label: t('dashboard.waitingPayment'), matches: ['Waiting Payment'], fallback: 0 },
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
    { label: t('dashboard.revenueToday'), value: stats.revenue, note: t('dashboard.fromYesterday'), tone: 'primary', icon: CreditCard },
    { label: t('dashboard.activeOrders'), value: String(stats.activeOrders), note: `${stats.waitingPayment} ${t('dashboard.waitingPaymentLower')}`, tone: '', icon: ReceiptText },
    { label: t('dashboard.qrOrders'), value: String(stats.qrOrders), note: t('dashboard.tableScanOrders'), tone: '', icon: QrCode },
    { label: t('dashboard.needAction'), value: String(stats.needAction), note: t('dashboard.readyCallWaiter'), tone: 'alert', icon: Bell },
  ];
  const quickActions = role === 'owner'
    ? [
        { label: t('dashboard.createOrder'), icon: Plus, action: () => onChangeView('menu'), primary: true },
        { label: t('dashboard.openCashier'), icon: CreditCard, action: () => onChangeView('cashier') },
        { label: t('dashboard.manageMenu'), icon: List, action: () => onChangeView('owner-menu') },
        { label: t('dashboard.generateQr'), icon: QrCode, action: () => onChangeView('owner-tables') },
      ]
    : role === 'kasir'
      ? [
          { label: t('dashboard.createOrder'), icon: Plus, action: () => onChangeView('menu'), primary: true },
          { label: t('dashboard.posCounter'), icon: List, action: () => onChangeView('menu') },
          { label: t('dashboard.paymentQueue'), icon: CreditCard, action: () => onChangeView('cashier') },
          { label: t('dashboard.orderBoard'), icon: ReceiptText, action: () => onChangeView('orders') },
        ]
      : [
          { label: t('dashboard.orderBoard'), icon: ReceiptText, action: () => onChangeView('orders'), primary: true },
          { label: t('dashboard.waitersStation'), icon: Bell, action: () => onChangeView('waiters') },
        ];

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
        <div className="date-label">{t('common.today')}, {new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium' }).format(new Date())}</div>
      </header>
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <div className="dashboard-stats-grid">
            {operationStats.map((stat) => (
              <article className={`dashboard-metric ${stat.tone}`} key={stat.label}>
                <div className="metric-icon"><stat.icon aria-hidden="true" /></div>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.note}</small>
              </article>
            ))}
          </div>

          <div className="dashboard-ops-grid">
            <section className="ops-card">
              <div className="admin-section-head compact-head">
                <div><h2>{t('dashboard.orderStatus')}</h2><p>{t('dashboard.liveOpsSplit')}</p></div>
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
                <div><h2>{t('dashboard.floorActivity')}</h2><p>{t('dashboard.tablesNeedAttention')}</p></div>
              </div>
              <div className="floor-mini-grid">
                <span className="ready">A4<small>{t('dashboard.ready')}</small></span>
                <span className="warning">B2<small>{t('dashboard.preparing')}</small></span>
                <span className="danger">B7<small>{t('dashboard.call')}</small></span>
                <span>C2<small>{t('dashboard.payment')}</small></span>
              </div>
            </section>
          </div>

          <section className="order-list-panel dashboard-recent">
            <div className="admin-section-head">
              <div><h2>{t('dashboard.recentOrders')}</h2><p>{t('dashboard.latestOrders')}</p></div>
              <button type="button" onClick={() => onChangeView('orders')}>{t('common.viewAll')}</button>
            </div>
            <div className="order-feed">
              {orders.slice(0, 5).map((order, index) => (
                <article className="feed-row" key={order.id ?? order.orderNumber ?? `${order.table}-${order.name}-${index}`}>
                  <span className={`table-pill ${order.tone}`}>{order.table}</span>
                  <div><strong>{order.name}</strong><small>{order.items.length} {t('common.items')}</small></div>
                  <span className={`mini-status ${order.statusTone}`}>{order.status}</span>
                  <small>{order.status === 'Ready' ? t('dashboard.readyToServe') : t('dashboard.waitingPaymentLower')}</small>
                  <button type="button" onClick={() => onChangeView('cashier')}>{t('dashboard.payNow')}</button>
                </article>
              ))}
            </div>
          </section>
        </div>
        <aside className="dashboard-side">
          <section className={`quick-actions-card quick-actions-${role}`}>
            <h2>{t('dashboard.quickActions')}</h2>
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
              <h3>{t('dashboard.popularMenu')}</h3>
              <button type="button" onClick={() => onChangeView(role === 'owner' ? 'owner-menu' : 'menu')}>{t('common.viewAll')}</button>
            </div>
            <ol className="rank-list">
              {dishes.slice(0, 4).map((dish, index) => (
                <li key={dish.id ?? `${dish.name}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><Image src={dish.image} alt="" width={80} height={80} /><strong>{dish.name}</strong><small>{23 - index * 4} {t('dashboard.sold')} - Rp {(1.2 - index * 0.18).toFixed(1)}M</small></li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}

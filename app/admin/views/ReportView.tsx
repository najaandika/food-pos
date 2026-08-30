'use client';

import './ReportView.css';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, RefreshCcw } from 'lucide-react';

import { AdminTitle } from '..';
import { formatRupiah } from '../../lib/format';
import { getDashboardStats } from '../runtime-data';
import type { PosReport } from '../../../lib/pos-types';

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultFromDate() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return dateKey(date);
}

const fallbackTraffic = [
  { label: 'Mon', qr: 8, dineIn: 12 },
  { label: 'Tue', qr: 14, dineIn: 10 },
  { label: 'Wed', qr: 11, dineIn: 9 },
  { label: 'Thu', qr: 16, dineIn: 13 },
  { label: 'Fri', qr: 18, dineIn: 15 },
  { label: 'Sat', qr: 22, dineIn: 17 },
  { label: 'Sun', qr: 19, dineIn: 14 },
];

export function ReportView({ dashboard }: { dashboard?: Parameters<typeof getDashboardStats>[0] }) {
  const stats = getDashboardStats(dashboard);
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(() => dateKey(new Date()));
  const [report, setReport] = useState<PosReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports?from=${from}&to=${to}`, { cache: 'no-store' });
      if (response.ok) setReport(await response.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [from, to]);

  const traffic = report?.traffic.length ? report.traffic : fallbackTraffic;
  const maxTraffic = Math.max(1, ...traffic.flatMap((item) => [item.qr, item.dineIn]));
  const categorySales = report?.categorySales.length
    ? report.categorySales
    : [
        { name: 'Coffee', quantity: 168, growth: 9.1 },
        { name: 'Food', quantity: 132, growth: 6.3 },
        { name: 'Snack', quantity: 74, growth: -1.4 },
      ];
  const channels = report?.serviceChannels ?? { qr: 142, manual: 24, dineIn: 126, takeaway: 60 };
  const summary = report?.summary ?? {
    revenue: dashboard?.revenueToday ?? 0,
    totalOrders: stats.activeOrders + stats.paidToday,
    qrOrders: stats.qrOrders,
    menuSold: 428,
    waitingPayment: stats.waitingPayment,
  };

  const rangeLabel = useMemo(() => {
    if (!report) return 'Selected range';
    return `${report.range.from} to ${report.range.to}`;
  }, [report]);

  return (
    <section className="app-view active">
      <header className="topbar report-topbar">
        <div className="report-title-block">
          <AdminTitle title="Sales Report" subtitle="Review revenue, QR orders, service channels, and menu performance." />
        </div>
        <div className="report-date-tools" aria-label="Report date range">
          <CalendarDays aria-hidden="true" />
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <span>to</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <button type="button" aria-label="Refresh report" onClick={() => void loadReport()}>
            <RefreshCcw aria-hidden="true" className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </header>

      <div className="report-layout">
        <section className="report-main">
          <div className="report-stats">
            <article className="report-stat primary featured">
              <span>Revenue</span>
              <strong>{formatRupiah(summary.revenue)}</strong>
              <small>{rangeLabel}</small>
            </article>
            <article className="report-stat"><span>Total Orders</span><strong>{summary.totalOrders}</strong><small>{summary.waitingPayment} waiting payment</small></article>
            <article className="report-stat"><span>QR Table Orders</span><strong>{summary.qrOrders}</strong><small>Orders came from QR menu</small></article>
            <article className="report-stat"><span>Menu Sold</span><strong>{summary.menuSold}</strong><small>Total items sold in selected dates</small></article>
          </div>

          <section className="habits-card">
            <div className="report-card-head">
              <div><h2>Order Traffic</h2><p>Daily QR and dine-in activity</p></div>
              <button type="button">{traffic.length} days</button>
            </div>
            <div className="bar-chart" aria-label="Order traffic bar chart">
              {traffic.map((item, index) => (
                <div className="bar-group" style={{ '--chart-delay': `${index * 70}ms` } as CSSProperties} key={`${item.label}-${index}`}>
                  <div className="bars">
                    <span style={{ height: `${Math.max(8, (item.dineIn / maxTraffic) * 100)}%` }} />
                    <b style={{ height: `${Math.max(8, (item.qr / maxTraffic) * 100)}%` }} />
                  </div>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>
            <div className="report-order-detail">
              <div className="report-card-head compact">
                <div><h2>Recent Orders</h2><p>Latest transactions in this date range</p></div>
              </div>
              <div className="report-order-list">
                {(report?.recentOrders ?? []).map((order) => (
                  <p key={order.id}>
                    <span>{order.tableCode ?? 'TA'}</span>
                    <strong>{order.customerName}</strong>
                    <small>{order.status.replaceAll('_', ' ')}</small>
                    <b>{formatRupiah(order.total)}</b>
                  </p>
                ))}
                {report && report.recentOrders.length === 0 && <em>No orders in this date range.</em>}
              </div>
            </div>
          </section>
        </section>

        <aside className="report-side">
          <section className="product-stat-card">
            <div className="report-card-head">
              <div><h2>Menu Category Sales</h2><p>Best performing categories</p></div>
              <button type="button">Range</button>
            </div>
            <div className="donut-wrap">
              <div className="donut-ring"><strong>{summary.menuSold}</strong><span>Menu Items Sold</span></div>
            </div>
            <div className="product-list">
              {categorySales.map((category) => (
                <p key={category.name}>
                  <span>{category.name}</span>
                  <strong>{category.quantity}</strong>
                  <b className={category.growth < 0 ? 'down' : ''}>{category.growth > 0 ? '+' : ''}{category.growth}%</b>
                </p>
              ))}
            </div>
          </section>

          <section className="growth-card">
            <div className="report-card-head">
              <div><h2>Service Channel</h2><p>Orders by source and service type</p></div>
              <button type="button">Range</button>
            </div>
            <div className="bubble-row">
              <span><small>Manual</small>{channels.manual}</span><strong><small>QR</small>{channels.qr}</strong><b><small>TA</small>{channels.takeaway}</b><em><small>Dine In</small>{channels.dineIn}</em>
            </div>
            <div className="country-list">
              <p><span>QR Orders</span><b style={{ width: `${Math.min(100, channels.qr || 8)}%` }} /></p>
              <p><span>Dine In</span><b style={{ width: `${Math.min(100, channels.dineIn || 8)}%` }} /></p>
              <p><span>Takeaway</span><b style={{ width: `${Math.min(100, channels.takeaway || 8)}%` }} /></p>
              <p><span>Manual Orders</span><b style={{ width: `${Math.min(100, channels.manual || 8)}%` }} /></p>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

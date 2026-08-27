'use client';

import type { CSSProperties } from 'react';
import { Bell, Search } from 'lucide-react';

import { AdminTitle } from '..';
import { getDashboardStats } from '../runtime-data';

export function ReportView({ dashboard }: { dashboard?: Parameters<typeof getDashboardStats>[0] }) {
  const stats = getDashboardStats(dashboard);
  const months = [
    ['Jan', 28, 40],
    ['Feb', 58, 44],
    ['Mar', 26, 20],
    ['Apr', 62, 38],
    ['May', 28, 18],
    ['Jun', 36, 31],
    ['Jul', 32, 22],
  ] as const;

  return (
    <section className="app-view active">
      <header className="topbar report-topbar">
        <div className="report-title-block">
          <AdminTitle title="Sales Report" subtitle="Review revenue, QR orders, service channels, and menu performance." />
        </div>
        <div className="report-actions">
          <button type="button" aria-label="Search"><Search aria-hidden="true" /></button>
          <button type="button" aria-label="Notifications"><Bell aria-hidden="true" /></button>
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80" alt="Ferra Alexandra" />
        </div>
      </header>

      <div className="report-layout">
        <section className="report-main">
          <div className="report-stats">
            <article className="report-stat primary featured"><span>Revenue Today</span><strong>{stats.revenue}</strong><small>+8.4% compared with yesterday</small></article>
            <article className="report-stat"><span>Total Orders</span><strong>{stats.activeOrders + stats.paidToday}</strong><small>{stats.waitingPayment} waiting payment</small></article>
            <article className="report-stat"><span>QR Table Orders</span><strong>{stats.qrOrders}</strong><small>Orders came from QR menu</small></article>
            <article className="report-stat"><span>Menu Sold</span><strong>428</strong><small>+12.1% items sold this week</small></article>
          </div>

          <section className="habits-card">
            <div className="report-card-head">
              <div><h2>Order Traffic</h2><p>Track dine-in and QR order trends</p></div>
              <button type="button">This year</button>
            </div>
            <div className="bar-chart" aria-label="Customer habits bar chart">
              {months.map(([month, seen, sales], index) => (
                <div className="bar-group" style={{ '--chart-delay': `${index * 70}ms` } as CSSProperties} key={month}>
                  <div className="bars">
                    <span style={{ height: `${seen}%` }} />
                    <b style={{ height: `${sales}%` }} />
                  </div>
                  <small>{month}</small>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="report-side">
          <section className="product-stat-card">
            <div className="report-card-head">
              <div><h2>Menu Category Sales</h2><p>Track best performing categories</p></div>
              <button type="button">Today</button>
            </div>
            <div className="donut-wrap">
              <div className="donut-ring"><strong>428</strong><span>Menu Items Sold</span></div>
            </div>
            <div className="product-list">
              <p><span>Coffee</span><strong>168</strong><b>+9.1%</b></p>
              <p><span>Food</span><strong>132</strong><b>+6.3%</b></p>
              <p><span>Snack</span><strong>74</strong><b className="down">-1.4%</b></p>
            </div>
          </section>

          <section className="growth-card">
            <div className="report-card-head">
              <div><h2>Service Channel</h2><p>Track orders by service type</p></div>
              <button type="button">Today</button>
            </div>
            <div className="bubble-row">
              <span><small>Manual</small>24</span><strong><small>QR</small>142</strong><b><small>TA</small>60</b><em><small>Dine In</small>126</em>
            </div>
            <div className="country-list">
              <p><span>QR Orders</span><b /></p>
              <p><span>Dine In</span><b /></p>
              <p><span>Takeaway</span><b /></p>
              <p><span>Manual Orders</span><b /></p>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}


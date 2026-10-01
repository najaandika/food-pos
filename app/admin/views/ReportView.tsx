'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, RefreshCcw } from 'lucide-react';

import { AdminTitle } from '..';
import { formatRupiah } from '../../lib/format';
import type { PosDashboard, PosReport } from '../../../lib/pos-types';
import { businessDateKey } from '../../../lib/business-time';

export function ReportView({ dashboard }: { dashboard?: PosDashboard }) {
  const [from, setFrom] = useState(() => businessDateKey(new Date()));
  const [to, setTo] = useState(() => businessDateKey(new Date()));
  const [report, setReport] = useState<PosReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const latestRequestRef = useRef(0);

  const loadReport = useCallback(async () => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setIsLoading(true);
    setReportError('');
    try {
      const response = await fetch(`/api/reports?from=${from}&to=${to}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Unable to load report data.');
      }
      const nextReport = (await response.json()) as PosReport;
      if (requestId === latestRequestRef.current) {
        setReport(nextReport);
      }
    } catch {
      if (requestId === latestRequestRef.current) {
        setReportError('Report data could not be refreshed. Please try again.');
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, [from, to]);

  useEffect(() => {
    void loadReport();
  }, [dashboard, loadReport]);

  const currentReport = report?.range.from === from && report.range.to === to ? report : null;
  const traffic = currentReport?.traffic ?? [];
  const maxTraffic = Math.max(1, ...traffic.flatMap((item) => [item.qr, item.dineIn]));
  const hasTraffic = traffic.some((item) => item.qr > 0 || item.dineIn > 0);
  const categorySales = currentReport?.categorySales ?? [];
  const channels = currentReport?.serviceChannels ?? { qr: 0, manual: 0, dineIn: 0, takeaway: 0 };
  const summary = currentReport?.summary ?? {
    revenue: 0,
    totalOrders: 0,
    qrOrders: 0,
    menuSold: 0,
    waitingPayment: 0,
  };

  const rangeLabel = useMemo(() => {
    if (!currentReport) return `${from} to ${to}`;
    return `${currentReport.range.from} to ${currentReport.range.to}`;
  }, [currentReport, from, to]);

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

      {reportError && <p className="report-load-note">{reportError}</p>}

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
            <div className="report-chart-legend" aria-label="Chart legend">
              <span><i className="qr" /> QR orders</span>
              <span><i className="dine-in" /> Dine in</span>
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
              {!isLoading && !hasTraffic && <p className="report-chart-empty">No order traffic in this date range.</p>}
            </div>
            <div className="report-order-detail">
              <div className="report-card-head compact">
                <div><h2>Recent Orders</h2><p>Latest transactions in this date range</p></div>
              </div>
              <div className="report-order-list">
                {(currentReport?.recentOrders ?? []).map((order) => (
                  <p key={order.id}>
                    <span>{order.tableCode ?? 'TA'}</span>
                    <strong>{order.customerName}</strong>
                    <small>{order.status.replaceAll('_', ' ')}</small>
                    <b>{formatRupiah(order.total)}</b>
                  </p>
                ))}
                {currentReport && !isLoading && currentReport.recentOrders.length === 0 && <em>No orders in this date range.</em>}
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

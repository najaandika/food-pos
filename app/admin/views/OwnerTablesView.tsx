'use client';

import { Copy, Download, Pencil, Printer, Search } from 'lucide-react';

import { AdminTitle, MockSelect } from '..';
import type { AdminTable } from '../runtime-data';

export function OwnerTablesView({ tables }: { tables?: AdminTable[] }) {
  const fallbackTables = [
    { code: 'A1', name: 'Indoor Window', area: 'Indoor', status: 'Available', seats: 2, scans: 18, lastOrder: 'No active order', tone: 'available' },
    { code: 'A4', name: 'Indoor Center', area: 'Indoor', status: 'Occupied', seats: 4, scans: 42, lastOrder: 'Order #925 - Ready', tone: 'occupied' },
    { code: 'B2', name: 'Bar Area', area: 'Bar', status: 'Preparing', seats: 2, scans: 31, lastOrder: 'Order #921 - 8 min', tone: 'preparing' },
    { code: 'B7', name: 'Outdoor Bench', area: 'Outdoor', status: 'Need Waiter', seats: 4, scans: 27, lastOrder: 'Customer call - 1 min', tone: 'call' },
    { code: 'C2', name: 'Terrace', area: 'Terrace', status: 'Waiting Payment', seats: 3, scans: 22, lastOrder: 'Bill requested', tone: 'payment' },
    { code: 'O1', name: 'Outdoor Surf Corner', area: 'Outdoor', status: 'Inactive', seats: 4, scans: 9, lastOrder: 'QR paused', tone: 'inactive' },
  ];
  const cafeTables = tables?.length ? tables : fallbackTables;
  const tableStats = [
    { label: 'Active QR', value: String(cafeTables.filter((table) => table.status !== 'Inactive').length), hint: 'Tables online' },
    { label: 'Scans Today', value: String(cafeTables.reduce((total, table) => total + table.scans, 0)), hint: 'From QR table links' },
    { label: 'Need Action', value: String(cafeTables.filter((table) => ['Need Waiter', 'Waiting Payment', 'Ready'].includes(table.status)).length), hint: 'Waiter or payment' },
  ];

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Tables & QR" subtitle="Manage table codes, QR stickers, areas, and ordering links." />
        <button className="owner-primary-btn" type="button">Add Table</button>
      </header>

      <div className="tables-layout">
        <section className="tables-main">
          <div className="tables-summary">
            {tableStats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.hint}</small>
              </article>
            ))}
          </div>

          <div className="table-tools">
            <label className="search-wrap"><input type="search" placeholder="Search table code or area" /><Search aria-hidden="true" /></label>
            <div className="owner-filter-tabs">
              <button className="active" type="button">All</button>
              <button type="button">Indoor</button>
              <button type="button">Outdoor</button>
              <button type="button">Inactive</button>
            </div>
          </div>

          <div className="qr-table-grid">
            {cafeTables.map((table) => (
              <article className={`qr-table-card ${table.tone}`} key={table.code}>
                <div className="qr-card-top">
                  <span className={`table-pill ${table.tone === 'inactive' ? 'gold' : 'teal'}`}>{table.code}</span>
                  <div><strong>{table.name}</strong><small>{table.area} - {table.seats} seats</small></div>
                </div>
                <div className="qr-card-body">
                  <div className="qr-preview" aria-hidden="true">
                    <span /><span /><span /><span /><span /><span /><span /><span /><span />
                  </div>
                  <div>
                    <span className={`table-state ${table.status.toLowerCase().replaceAll(' ', '-')}`}>{table.status}</span>
                    <p>{table.lastOrder}</p>
                    <small>{table.scans} scans today</small>
                  </div>
                </div>
                <div className="qr-card-bottom">
                  <a href={`/table/${table.code}`}>/table/{table.code}</a>
                  <div>
                    <button className="qr-icon-action" type="button" aria-label={`Print QR for table ${table.code}`}><Printer aria-hidden="true" /></button>
                    <button className="qr-icon-action" type="button" aria-label={`Edit table ${table.code}`}><Pencil aria-hidden="true" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="qr-editor-panel">
          <div className="qr-panel-head">
            <span className="mini-status ready">Selected Table</span>
            <button type="button">Online</button>
          </div>
          <div className="qr-large-preview">
            <div className="qr-preview big" aria-hidden="true">
              <span /><span /><span /><span /><span /><span /><span /><span /><span />
            </div>
            <strong>Table A4</strong>
            <p>https://blocbarat.local/table/A4</p>
          </div>

          <div className="qr-link-box">
            <span>Customer Link</span>
            <strong>/table/A4</strong>
            <button type="button"><Copy aria-hidden="true" />Copy</button>
          </div>

          <div className="editor-fields">
            <label><span>Table Code</span><input defaultValue="A4" /></label>
            <label><span>Display Name</span><input defaultValue="Indoor Center" /></label>
            <div className="editor-field"><span>Area</span><MockSelect value="Indoor" options={['Indoor', 'Outdoor', 'Bar', 'Terrace']} /></div>
            <label><span>Seats</span><input defaultValue="4" /></label>
          </div>

          <div className="qr-health-list">
            <p><span>QR status</span><strong>Active</strong></p>
            <p><span>Last scan</span><strong>2 min ago</strong></p>
            <p><span>Current order</span><strong>#925</strong></p>
          </div>

          <div className="qr-actions">
            <button type="button"><Download aria-hidden="true" /><span>Download QR</span></button>
            <button type="button"><Printer aria-hidden="true" /><span>Print Sticker</span></button>
          </div>
          <button className="bulk-qr-btn" type="button">Bulk Generate QR Codes</button>
        </aside>
      </div>
    </section>
  );
}


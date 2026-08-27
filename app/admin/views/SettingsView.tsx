'use client';

import { AdminTitle, MockSelect } from '..';

export function SettingsView() {
  const settingsStats = [
    { label: 'QR Ordering', value: 'Online', hint: '18 tables active' },
    { label: 'Tax Rate', value: '5%', hint: 'Applied at checkout' },
    { label: 'Payments', value: '2 Active', hint: 'Cash and QRIS' },
  ];

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Cafe Settings" subtitle="Configure cafe profile, tax, receipt, QR ordering, and payments." />
        <button className="owner-primary-btn" type="button">Save Changes</button>
      </header>

      <div className="settings-layout">
        <section className="settings-main">
          <div className="settings-summary">
            {settingsStats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.hint}</small>
              </article>
            ))}
          </div>

          <div className="settings-card">
            <div className="settings-card-head">
              <div><h2>Cafe Profile</h2><p>Information shown on customer QR menu and receipts.</p></div>
            </div>
            <div className="settings-grid">
              <label><span>Cafe Name</span><input defaultValue="Cafe Bloc Barat" /></label>
              <label><span>Phone</span><input defaultValue="+62 812-0000-0000" /></label>
              <label className="wide"><span>Address</span><input defaultValue="Krui, Pesisir Barat, Lampung" /></label>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-head">
              <div><h2>Operational Hours</h2><p>Used to inform customer ordering availability.</p></div>
            </div>
            <div className="hours-list">
              {['Monday - Thursday', 'Friday', 'Saturday - Sunday'].map((day, index) => (
                <div className="hours-row" key={day}>
                  <strong>{day}</strong>
                  <input defaultValue={index === 0 ? '09:00' : '08:00'} />
                  <span>to</span>
                  <input defaultValue={index === 0 ? '22:00' : '23:00'} />
                  <button className="availability-toggle" type="button"><i />Open</button>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-head">
              <div><h2>Tax & Service</h2><p>Applied to order summary and cashier bill.</p></div>
            </div>
            <div className="settings-grid compact">
              <label><span>Tax</span><input defaultValue="5%" /></label>
              <label><span>Service Charge</span><input defaultValue="0%" /></label>
              <div className="editor-field"><span>Currency</span><MockSelect value="IDR" options={['IDR', 'USD']} /></div>
            </div>
          </div>
        </section>

        <aside className="settings-side">
          <section className="settings-card">
            <div className="settings-card-head"><div><h2>Payment Methods</h2><p>Available at cashier.</p></div></div>
            <div className="settings-toggles">
              <button className="active" type="button"><span>Cash</span><b>Enabled</b></button>
              <button className="active" type="button"><span>QRIS</span><b>Enabled</b></button>
              <button type="button"><span>Transfer</span><b>Off</b></button>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-head"><div><h2>QR Ordering</h2><p>Customer ordering behavior.</p></div></div>
            <div className="settings-options">
              <p><span>Allow order without login</span><b>On</b><i /></p>
              <p><span>Require customer name</span><b>On</b><i /></p>
              <p><span>Enable call waiter</span><b>On</b><i /></p>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-head"><div><h2>Receipt</h2><p>Printed bill and digital receipt.</p></div></div>
            <div className="receipt-mini">
              <strong>Cafe Bloc Barat</strong>
              <span>Krui, Pesisir Barat</span>
              <p>Order #925 - Table A4</p>
              <b>Thank you for visiting.</b>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}


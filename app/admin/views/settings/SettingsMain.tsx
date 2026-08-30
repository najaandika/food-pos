'use client';

import type { PosSettings } from '@/lib/pos-types';

type Props = {
  settings: PosSettings;
  settingsStats: Array<{ label: string; value: string; hint: string }>;
  validationMessage: string;
  saved: boolean;
  error: string;
  onUpdateProfile: (key: keyof PosSettings['profile'], value: string) => void;
  onUpdateTax: (key: keyof PosSettings['tax'], value: string) => void;
  onUpdateHours: (index: number, key: keyof PosSettings['hours'][number], value: string | boolean) => void;
};

export function SettingsMain({ settings, settingsStats, validationMessage, saved, error, onUpdateProfile, onUpdateTax, onUpdateHours }: Props) {
  return (
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

      {validationMessage && <p className="settings-save-note warning">{validationMessage}</p>}
      {saved && <p className="settings-save-note">Settings saved to database and synced to POS, cashier, and QR menu.</p>}
      {error && <p className="settings-save-note error">{error}</p>}

      <div className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Cafe Profile</h2>
            <p>Information shown on customer QR menu and receipts.</p>
          </div>
        </div>
        <div className="settings-grid">
          <label>
            <span>Cafe Name</span>
            <input value={settings.profile.cafeName} onChange={(event) => onUpdateProfile('cafeName', event.target.value)} />
          </label>
          <label>
            <span>Phone</span>
            <input value={settings.profile.phone} onChange={(event) => onUpdateProfile('phone', event.target.value)} />
          </label>
          <label className="wide">
            <span>Address</span>
            <input value={settings.profile.address} onChange={(event) => onUpdateProfile('address', event.target.value)} />
          </label>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Operational Hours</h2>
            <p>Used to inform customer ordering availability.</p>
          </div>
        </div>
        <div className="hours-list">
          {settings.hours.map((hour, index) => (
            <div className="hours-row" key={hour.label}>
              <strong>{hour.label}</strong>
              <input value={hour.open} onChange={(event) => onUpdateHours(index, 'open', event.target.value)} />
              <span>to</span>
              <input value={hour.close} onChange={(event) => onUpdateHours(index, 'close', event.target.value)} />
              <button className={`availability-toggle ${hour.isOpen ? 'active' : ''}`} type="button" onClick={() => onUpdateHours(index, 'isOpen', !hour.isOpen)}>
                <i />
                {hour.isOpen ? 'Open' : 'Closed'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Tax & Service</h2>
            <p>Applied to order summary and cashier bill.</p>
          </div>
        </div>
        <div className="settings-grid compact">
          <label>
            <span>Tax</span>
            <input type="number" min="0" max="100" value={settings.tax.taxRate} onChange={(event) => onUpdateTax('taxRate', event.target.value)} />
          </label>
          <label>
            <span>Service Charge</span>
            <input type="number" min="0" max="100" value={settings.tax.serviceRate} onChange={(event) => onUpdateTax('serviceRate', event.target.value)} />
          </label>
          <label>
            <span>Currency</span>
            <select value={settings.tax.currency} onChange={(event) => onUpdateTax('currency', event.target.value)}>
              <option>IDR</option>
              <option>USD</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

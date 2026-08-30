'use client';

import { useEffect, useMemo, useState } from 'react';

import { AdminTitle } from '..';
import type { PosSettings } from '../../../lib/pos-types';

type PaymentKey = 'cash' | 'qris' | 'transfer';
type QrKey = 'guestOrdering' | 'customerName' | 'callWaiter' | 'autoAcceptQr';

const defaultSettings: PosSettings = {
  profile: {
    cafeName: 'Cafe Bloc Barat',
    phone: '+62 812-0000-0000',
    address: 'Krui, Pesisir Barat, Lampung',
  },
  tax: {
    taxRate: 5,
    serviceRate: 0,
    currency: 'IDR',
  },
  payments: {
    cash: true,
    qris: true,
    transfer: false,
  },
  qrOptions: {
    guestOrdering: true,
    customerName: true,
    callWaiter: true,
    autoAcceptQr: false,
  },
  hours: [
    { label: 'Monday - Thursday', open: '09:00', close: '22:00', isOpen: true },
    { label: 'Friday', open: '08:00', close: '23:00', isOpen: true },
    { label: 'Saturday - Sunday', open: '08:00', close: '23:00', isOpen: true },
  ],
};

export function SettingsView({
  initialSettings,
  onSaved,
}: {
  initialSettings?: PosSettings;
  onSaved?: () => Promise<void> | void;
}) {
  const [settings, setSettings] = useState<PosSettings>(initialSettings ?? defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load settings');
        setSettings(await response.json());
      } catch (settingsError) {
        setError(settingsError instanceof Error ? settingsError.message : 'Unable to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, [initialSettings]);

  const validationMessage = useMemo(() => {
    if (!settings.profile.cafeName.trim()) return 'Cafe name is required.';
    if (!Number.isFinite(settings.tax.taxRate) || settings.tax.taxRate < 0 || settings.tax.taxRate > 100) return 'Tax rate must be between 0 and 100.';
    if (!Number.isFinite(settings.tax.serviceRate) || settings.tax.serviceRate < 0 || settings.tax.serviceRate > 100) return 'Service charge must be between 0 and 100.';
    if (!settings.payments.cash && !settings.payments.qris && !settings.payments.transfer) return 'Keep at least one payment method active.';
    return '';
  }, [settings]);

  const settingsStats = [
    { label: 'QR Ordering', value: settings.qrOptions.guestOrdering ? 'Online' : 'Paused', hint: settings.qrOptions.callWaiter ? 'Call waiter enabled' : 'Call waiter off' },
    { label: 'Tax Rate', value: `${settings.tax.taxRate}%`, hint: `${settings.tax.serviceRate}% service charge` },
    { label: 'Payments', value: `${Object.values(settings.payments).filter(Boolean).length} Active`, hint: 'Cash, QRIS, or transfer' },
  ];

  const updateProfile = (key: keyof PosSettings['profile'], value: string) => {
    setSaved(false);
    setError('');
    setSettings((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  };

  const updateTax = (key: keyof PosSettings['tax'], value: string) => {
    setSaved(false);
    setError('');
    setSettings((current) => ({
      ...current,
      tax: {
        ...current.tax,
        [key]: key === 'currency' ? value : Number(value),
      },
    }));
  };

  const updateHours = (index: number, key: keyof PosSettings['hours'][number], value: string | boolean) => {
    setSaved(false);
    setError('');
    setSettings((current) => ({
      ...current,
      hours: current.hours.map((hour, hourIndex) => hourIndex === index ? { ...hour, [key]: value } : hour),
    }));
  };

  const togglePayment = (key: PaymentKey) => {
    setSaved(false);
    setError('');
    setSettings((current) => ({
      ...current,
      payments: { ...current.payments, [key]: !current.payments[key] },
    }));
  };

  const toggleQrOption = (key: QrKey) => {
    setSaved(false);
    setError('');
    setSettings((current) => ({
      ...current,
      qrOptions: { ...current.qrOptions, [key]: !current.qrOptions[key] },
    }));
  };

  const saveSettings = async () => {
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsSaving(true);
    setError('');
    setSaved(false);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Unable to save settings' }));
        throw new Error(payload.error ?? 'Unable to save settings');
      }

      const payload = await response.json();
      setSettings(payload.settings);
      setSaved(true);
      await onSaved?.();
      window.setTimeout(() => setSaved(false), 2400);
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : 'Unable to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Cafe Settings" subtitle="Configure cafe profile, tax, receipt, QR ordering, and payments." />
        <button className="owner-primary-btn" type="button" disabled={isSaving || isLoading || Boolean(validationMessage)} onClick={saveSettings}>
          {isSaving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </button>
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

          {validationMessage && <p className="settings-save-note warning">{validationMessage}</p>}
          {saved && <p className="settings-save-note">Settings saved to database and synced to POS, cashier, and QR menu.</p>}
          {error && <p className="settings-save-note error">{error}</p>}

          <div className="settings-card">
            <div className="settings-card-head">
              <div><h2>Cafe Profile</h2><p>Information shown on customer QR menu and receipts.</p></div>
            </div>
            <div className="settings-grid">
              <label><span>Cafe Name</span><input value={settings.profile.cafeName} onChange={(event) => updateProfile('cafeName', event.target.value)} /></label>
              <label><span>Phone</span><input value={settings.profile.phone} onChange={(event) => updateProfile('phone', event.target.value)} /></label>
              <label className="wide"><span>Address</span><input value={settings.profile.address} onChange={(event) => updateProfile('address', event.target.value)} /></label>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-head">
              <div><h2>Operational Hours</h2><p>Used to inform customer ordering availability.</p></div>
            </div>
            <div className="hours-list">
              {settings.hours.map((hour, index) => (
                <div className="hours-row" key={hour.label}>
                  <strong>{hour.label}</strong>
                  <input value={hour.open} onChange={(event) => updateHours(index, 'open', event.target.value)} />
                  <span>to</span>
                  <input value={hour.close} onChange={(event) => updateHours(index, 'close', event.target.value)} />
                  <button className={`availability-toggle ${hour.isOpen ? 'active' : ''}`} type="button" onClick={() => updateHours(index, 'isOpen', !hour.isOpen)}><i />{hour.isOpen ? 'Open' : 'Closed'}</button>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-head">
              <div><h2>Tax & Service</h2><p>Applied to order summary and cashier bill.</p></div>
            </div>
            <div className="settings-grid compact">
              <label><span>Tax</span><input type="number" min="0" max="100" value={settings.tax.taxRate} onChange={(event) => updateTax('taxRate', event.target.value)} /></label>
              <label><span>Service Charge</span><input type="number" min="0" max="100" value={settings.tax.serviceRate} onChange={(event) => updateTax('serviceRate', event.target.value)} /></label>
              <label><span>Currency</span><select value={settings.tax.currency} onChange={(event) => updateTax('currency', event.target.value)}><option>IDR</option><option>USD</option></select></label>
            </div>
          </div>
        </section>

        <aside className="settings-side">
          <section className="settings-card">
            <div className="settings-card-head"><div><h2>Payment Methods</h2><p>Available at cashier.</p></div></div>
            <div className="settings-toggles">
              <button className={settings.payments.cash ? 'active' : ''} type="button" onClick={() => togglePayment('cash')}><span>Cash</span><b>{settings.payments.cash ? 'Enabled' : 'Off'}</b></button>
              <button className={settings.payments.qris ? 'active' : ''} type="button" onClick={() => togglePayment('qris')}><span>QRIS</span><b>{settings.payments.qris ? 'Enabled' : 'Off'}</b></button>
              <button className={settings.payments.transfer ? 'active' : ''} type="button" onClick={() => togglePayment('transfer')}><span>Transfer</span><b>{settings.payments.transfer ? 'Enabled' : 'Off'}</b></button>
            </div>
            <p className="settings-impact-note">Cashier will only show active methods when closing a bill.</p>
          </section>

          <section className="settings-card">
            <div className="settings-card-head"><div><h2>QR Ordering</h2><p>Customer ordering behavior.</p></div></div>
            <div className="settings-options">
              <button className={settings.qrOptions.guestOrdering ? 'active' : ''} type="button" onClick={() => toggleQrOption('guestOrdering')}><span>Allow order without login</span><b>{settings.qrOptions.guestOrdering ? 'On' : 'Off'}</b><i /></button>
              <button className={settings.qrOptions.customerName ? 'active' : ''} type="button" onClick={() => toggleQrOption('customerName')}><span>Require customer name</span><b>{settings.qrOptions.customerName ? 'On' : 'Off'}</b><i /></button>
              <button className={settings.qrOptions.callWaiter ? 'active' : ''} type="button" onClick={() => toggleQrOption('callWaiter')}><span>Enable call waiter</span><b>{settings.qrOptions.callWaiter ? 'On' : 'Off'}</b><i /></button>
              <button className={settings.qrOptions.autoAcceptQr ? 'active' : ''} type="button" onClick={() => toggleQrOption('autoAcceptQr')}><span>Auto accept QR orders</span><b>{settings.qrOptions.autoAcceptQr ? 'On' : 'Off'}</b><i /></button>
            </div>
            <p className={`settings-impact-note ${settings.qrOptions.guestOrdering ? '' : 'warning'}`}>
              {settings.qrOptions.guestOrdering ? 'Customer table links can create orders.' : 'Customer table links will show ordering paused.'}
            </p>
          </section>

          <section className="settings-card">
            <div className="settings-card-head"><div><h2>Receipt</h2><p>Printed bill and digital receipt.</p></div></div>
            <div className="receipt-mini">
              <strong>{settings.profile.cafeName}</strong>
              <span>{settings.profile.address}</span>
              <p>Order #925 - Table A4</p>
              <b>Thank you for visiting.</b>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

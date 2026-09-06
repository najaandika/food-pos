'use client';

import { useEffect, useMemo, useState } from 'react';

import { AdminTitle } from '..';
import type { PosSettings } from '@/lib/pos-types';
import { SettingsMain } from './settings/SettingsMain';
import { SettingsSide } from './settings/SettingsSide';

type PaymentKey = 'cash' | 'qris' | 'transfer';
type QrKey = 'guestOrdering' | 'customerName' | 'callWaiter' | 'autoAcceptQr';

const defaultSettings: PosSettings = {
  profile: { cafeName: 'POS', phone: '+00 000 000 000', address: 'Global location' },
  tax: { taxRate: 5, serviceRate: 0, currency: 'IDR' },
  payments: { cash: true, qris: true, transfer: false },
  qrOptions: { guestOrdering: true, customerName: true, callWaiter: true, autoAcceptQr: false },
  hours: [
    { label: 'Monday - Thursday', open: '09:00', close: '22:00', isOpen: true },
    { label: 'Friday', open: '08:00', close: '23:00', isOpen: true },
    { label: 'Saturday - Sunday', open: '08:00', close: '23:00', isOpen: true },
  ],
};

export function SettingsView({ initialSettings, onSaved }: { initialSettings?: PosSettings; onSaved?: () => Promise<void> | void }) {
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
    setSettings((current) => ({ ...current, tax: { ...current.tax, [key]: key === 'currency' ? value : Number(value) } }));
  };

  const updateHours = (index: number, key: keyof PosSettings['hours'][number], value: string | boolean) => {
    setSaved(false);
    setError('');
    setSettings((current) => ({ ...current, hours: current.hours.map((hour, hourIndex) => (hourIndex === index ? { ...hour, [key]: value } : hour)) }));
  };

  const togglePayment = (key: PaymentKey) => {
    setSaved(false);
    setError('');
    setSettings((current) => ({ ...current, payments: { ...current.payments, [key]: !current.payments[key] } }));
  };

  const toggleQrOption = (key: QrKey) => {
    setSaved(false);
    setError('');
    setSettings((current) => ({ ...current, qrOptions: { ...current.qrOptions, [key]: !current.qrOptions[key] } }));
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
        const payload = (await response.json().catch(() => ({ error: 'Unable to save settings' }))) as { error?: string };
        throw new Error(payload.error ?? 'Unable to save settings');
      }
      const payload = (await response.json()) as { settings: PosSettings };
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
        <SettingsMain
          settings={settings}
          settingsStats={settingsStats}
          validationMessage={validationMessage}
          saved={saved}
          error={error}
          onUpdateProfile={updateProfile}
          onUpdateTax={updateTax}
          onUpdateHours={updateHours}
        />
        <SettingsSide settings={settings} onTogglePayment={togglePayment} onToggleQrOption={toggleQrOption} />
      </div>
    </section>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';

import { AdminTitle } from '..';
import type { PosSettings } from '@/lib/pos-types';
import { useLocale } from '../i18n-context';
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
  const { t } = useLocale();
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
        if (!response.ok) throw new Error(t('settings.errLoad'));
        setSettings(await response.json());
      } catch (settingsError) {
        setError(settingsError instanceof Error ? settingsError.message : t('settings.errLoad'));
      } finally {
        setIsLoading(false);
      }
    };
    void loadSettings();
  }, [initialSettings, t]);

  const validationMessage = useMemo(() => {
    if (!settings.profile.cafeName.trim()) return t('settings.errCafeName');
    if (!Number.isFinite(settings.tax.taxRate) || settings.tax.taxRate < 0 || settings.tax.taxRate > 100) return t('settings.errTaxRate');
    if (!Number.isFinite(settings.tax.serviceRate) || settings.tax.serviceRate < 0 || settings.tax.serviceRate > 100) return t('settings.errServiceRate');
    if (!settings.payments.cash && !settings.payments.qris && !settings.payments.transfer) return t('settings.errPaymentActive');
    return '';
  }, [settings, t]);

  const settingsStats = useMemo(
    () => [
      {
        label: t('settings.qrOrdering'),
        value: settings.qrOptions.guestOrdering ? t('settings.online') : t('settings.paused'),
        hint: settings.qrOptions.callWaiter ? t('settings.callWaiterEnabled') : t('settings.callWaiterOff'),
      },
      {
        label: t('settings.taxRate'),
        value: `${settings.tax.taxRate}%`,
        hint: `${settings.tax.serviceRate}% ${t('settings.serviceCharge')}`,
      },
      {
        label: t('settings.payments'),
        value: `${Object.values(settings.payments).filter(Boolean).length} ${t('settings.paymentsActive')}`,
        hint: t('settings.cashQrisTransfer'),
      },
    ],
    [settings, t],
  );

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
        const payload = (await response.json().catch(() => ({ error: t('settings.errSave') }))) as { error?: string };
        throw new Error(payload.error ?? t('settings.errSave'));
      }
      const payload = (await response.json()) as { settings: PosSettings };
      setSettings(payload.settings);
      setSaved(true);
      await onSaved?.();
      window.setTimeout(() => setSaved(false), 2400);
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : t('settings.errSave'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title={t('settings.title')} subtitle={t('settings.subtitle')} />
        <button className="owner-primary-btn" type="button" disabled={isSaving || isLoading || Boolean(validationMessage)} onClick={saveSettings}>
          {isSaving ? t('common.saving') : saved ? t('settings.saved') : t('settings.saveChanges')}
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

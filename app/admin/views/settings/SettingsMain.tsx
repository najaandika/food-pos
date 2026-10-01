'use client';

import type { PosSettings } from '@/lib/pos-types';
import { useLocale } from '../../i18n-context';

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
  const { t } = useLocale();

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
      {saved && <p className="settings-save-note">{t('settings.savedNote')}</p>}
      {error && <p className="settings-save-note error">{error}</p>}

      <div className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>{t('settings.cafeProfile')}</h2>
            <p>{t('settings.cafeProfileDesc')}</p>
          </div>
        </div>
        <div className="settings-grid">
          <label>
            <span>{t('settings.cafeName')}</span>
            <input value={settings.profile.cafeName} onChange={(event) => onUpdateProfile('cafeName', event.target.value)} />
          </label>
          <label>
            <span>{t('settings.phone')}</span>
            <input value={settings.profile.phone} onChange={(event) => onUpdateProfile('phone', event.target.value)} />
          </label>
          <label className="wide">
            <span>{t('settings.address')}</span>
            <input value={settings.profile.address} onChange={(event) => onUpdateProfile('address', event.target.value)} />
          </label>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>{t('settings.operationalHours')}</h2>
            <p>{t('settings.hoursDesc')}</p>
          </div>
        </div>
        <div className="hours-list">
          {settings.hours.map((hour, index) => (
            <div className="hours-row" key={hour.label}>
              <strong>{hour.label}</strong>
              <input value={hour.open} onChange={(event) => onUpdateHours(index, 'open', event.target.value)} />
              <span>{t('settings.to')}</span>
              <input value={hour.close} onChange={(event) => onUpdateHours(index, 'close', event.target.value)} />
              <button className={`availability-toggle ${hour.isOpen ? 'active' : ''}`} type="button" onClick={() => onUpdateHours(index, 'isOpen', !hour.isOpen)}>
                <i />
                {hour.isOpen ? t('common.open') : t('common.closed')}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>{t('settings.taxService')}</h2>
            <p>{t('settings.taxServiceDesc')}</p>
          </div>
        </div>
        <div className="settings-grid compact">
          <label>
            <span>{t('settings.tax')}</span>
            <input type="number" min="0" max="100" value={settings.tax.taxRate} onChange={(event) => onUpdateTax('taxRate', event.target.value)} />
          </label>
          <label>
            <span>{t('settings.serviceChargeLabel')}</span>
            <input type="number" min="0" max="100" value={settings.tax.serviceRate} onChange={(event) => onUpdateTax('serviceRate', event.target.value)} />
          </label>
          <label>
            <span>{t('settings.currency')}</span>
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

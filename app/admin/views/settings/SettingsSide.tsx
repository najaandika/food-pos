'use client';

import type { PosSettings } from '@/lib/pos-types';
import { useLocale } from '../../i18n-context';

type PaymentKey = 'cash' | 'qris' | 'transfer';
type QrKey = 'guestOrdering' | 'customerName' | 'callWaiter' | 'autoAcceptQr';

type Props = {
  settings: PosSettings;
  onTogglePayment: (key: PaymentKey) => void;
  onToggleQrOption: (key: QrKey) => void;
};

export function SettingsSide({ settings, onTogglePayment, onToggleQrOption }: Props) {
  const { t } = useLocale();

  return (
    <aside className="settings-side">
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>{t('settings.paymentMethods')}</h2>
            <p>{t('settings.paymentMethodsDesc')}</p>
          </div>
        </div>
        <div className="settings-toggles">
          <button className={settings.payments.cash ? 'active' : ''} type="button" onClick={() => onTogglePayment('cash')}>
            <span>{t('settings.cash')}</span>
            <b>{settings.payments.cash ? t('settings.enabled') : t('settings.off')}</b>
          </button>
          <button className={settings.payments.qris ? 'active' : ''} type="button" onClick={() => onTogglePayment('qris')}>
            <span>QRIS</span>
            <b>{settings.payments.qris ? t('settings.enabled') : t('settings.off')}</b>
          </button>
          <button className={settings.payments.transfer ? 'active' : ''} type="button" onClick={() => onTogglePayment('transfer')}>
            <span>{t('settings.transfer')}</span>
            <b>{settings.payments.transfer ? t('settings.enabled') : t('settings.off')}</b>
          </button>
        </div>
        <p className="settings-impact-note">{t('settings.paymentImpact')}</p>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>{t('settings.qrOrderingTitle')}</h2>
            <p>{t('settings.qrOrderingDesc')}</p>
          </div>
        </div>
        <div className="settings-options">
          <button className={settings.qrOptions.guestOrdering ? 'active' : ''} type="button" onClick={() => onToggleQrOption('guestOrdering')}>
            <span>{t('settings.allowGuest')}</span>
            <b>{settings.qrOptions.guestOrdering ? t('settings.on') : t('settings.off')}</b>
            <i />
          </button>
          <button className={settings.qrOptions.customerName ? 'active' : ''} type="button" onClick={() => onToggleQrOption('customerName')}>
            <span>{t('settings.requireName')}</span>
            <b>{settings.qrOptions.customerName ? t('settings.on') : t('settings.off')}</b>
            <i />
          </button>
          <button className={settings.qrOptions.callWaiter ? 'active' : ''} type="button" onClick={() => onToggleQrOption('callWaiter')}>
            <span>{t('settings.enableCallWaiter')}</span>
            <b>{settings.qrOptions.callWaiter ? t('settings.on') : t('settings.off')}</b>
            <i />
          </button>
          <button className={settings.qrOptions.autoAcceptQr ? 'active' : ''} type="button" onClick={() => onToggleQrOption('autoAcceptQr')}>
            <span>{t('settings.autoAcceptQr')}</span>
            <b>{settings.qrOptions.autoAcceptQr ? t('settings.on') : t('settings.off')}</b>
            <i />
          </button>
        </div>
        <p className={`settings-impact-note ${settings.qrOptions.guestOrdering ? '' : 'warning'}`}>
          {settings.qrOptions.guestOrdering ? t('settings.guestOrderingOn') : t('settings.guestOrderingOff')}
        </p>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>{t('settings.receipt')}</h2>
            <p>{t('settings.receiptDesc')}</p>
          </div>
        </div>
        <div className="receipt-mini">
          <strong>{settings.profile.cafeName}</strong>
          <span>{settings.profile.address}</span>
          <p>{t('settings.sampleOrder')}</p>
          <b>{t('settings.thankYou')}</b>
        </div>
      </section>
    </aside>
  );
}

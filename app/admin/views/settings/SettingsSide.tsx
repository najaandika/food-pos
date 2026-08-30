'use client';

import type { PosSettings } from '@/lib/pos-types';

type PaymentKey = 'cash' | 'qris' | 'transfer';
type QrKey = 'guestOrdering' | 'customerName' | 'callWaiter' | 'autoAcceptQr';

type Props = {
  settings: PosSettings;
  onTogglePayment: (key: PaymentKey) => void;
  onToggleQrOption: (key: QrKey) => void;
};

export function SettingsSide({ settings, onTogglePayment, onToggleQrOption }: Props) {
  return (
    <aside className="settings-side">
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Payment Methods</h2>
            <p>Available at cashier.</p>
          </div>
        </div>
        <div className="settings-toggles">
          <button className={settings.payments.cash ? 'active' : ''} type="button" onClick={() => onTogglePayment('cash')}>
            <span>Cash</span>
            <b>{settings.payments.cash ? 'Enabled' : 'Off'}</b>
          </button>
          <button className={settings.payments.qris ? 'active' : ''} type="button" onClick={() => onTogglePayment('qris')}>
            <span>QRIS</span>
            <b>{settings.payments.qris ? 'Enabled' : 'Off'}</b>
          </button>
          <button className={settings.payments.transfer ? 'active' : ''} type="button" onClick={() => onTogglePayment('transfer')}>
            <span>Transfer</span>
            <b>{settings.payments.transfer ? 'Enabled' : 'Off'}</b>
          </button>
        </div>
        <p className="settings-impact-note">Cashier will only show active methods when closing a bill.</p>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>QR Ordering</h2>
            <p>Customer ordering behavior.</p>
          </div>
        </div>
        <div className="settings-options">
          <button className={settings.qrOptions.guestOrdering ? 'active' : ''} type="button" onClick={() => onToggleQrOption('guestOrdering')}>
            <span>Allow order without login</span>
            <b>{settings.qrOptions.guestOrdering ? 'On' : 'Off'}</b>
            <i />
          </button>
          <button className={settings.qrOptions.customerName ? 'active' : ''} type="button" onClick={() => onToggleQrOption('customerName')}>
            <span>Require customer name</span>
            <b>{settings.qrOptions.customerName ? 'On' : 'Off'}</b>
            <i />
          </button>
          <button className={settings.qrOptions.callWaiter ? 'active' : ''} type="button" onClick={() => onToggleQrOption('callWaiter')}>
            <span>Enable call waiter</span>
            <b>{settings.qrOptions.callWaiter ? 'On' : 'Off'}</b>
            <i />
          </button>
          <button className={settings.qrOptions.autoAcceptQr ? 'active' : ''} type="button" onClick={() => onToggleQrOption('autoAcceptQr')}>
            <span>Auto accept QR orders</span>
            <b>{settings.qrOptions.autoAcceptQr ? 'On' : 'Off'}</b>
            <i />
          </button>
        </div>
        <p className={`settings-impact-note ${settings.qrOptions.guestOrdering ? '' : 'warning'}`}>
          {settings.qrOptions.guestOrdering ? 'Customer table links can create orders.' : 'Customer table links will show ordering paused.'}
        </p>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Receipt</h2>
            <p>Printed bill and digital receipt.</p>
          </div>
        </div>
        <div className="receipt-mini">
          <strong>{settings.profile.cafeName}</strong>
          <span>{settings.profile.address}</span>
          <p>Order #925 - Table A4</p>
          <b>Thank you for visiting.</b>
        </div>
      </section>
    </aside>
  );
}

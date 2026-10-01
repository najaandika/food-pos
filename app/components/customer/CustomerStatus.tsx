import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import type { PosOrderStatus } from '../../../lib/pos-types';
import styles from '../../table/[code]/Customer.module.css';
import {
  customerTranslations,
  type CustomerLocale,
  type CustomerTranslationKey,
} from '../../table/[code]/customer-i18n';

type CustomerStatusProps = {
  tableCode: string;
  orderId: number | null;
  orderNumber: string;
  icon: ReactNode;
  onAddMore: () => void;
  locale?: CustomerLocale;
  onToggleLocale?: (next: CustomerLocale) => void;
  t?: (key: CustomerTranslationKey) => string;
  onCallWaiter?: () => void;
  waiterCalled?: boolean;
};

type PublicOrderStatus = {
  status: PosOrderStatus;
  itemCount: number;
  total: number;
};

function getStatusDetails(status: PosOrderStatus, t: (key: CustomerTranslationKey) => string) {
  switch (status) {
    case 'pending':
      return { title: t('orderReceivedTitle'), body: t('orderReceivedBody'), activeStep: 1 };
    case 'accepted':
      return { title: t('orderAcceptedTitle'), body: t('orderAcceptedBody'), activeStep: 2 };
    case 'preparing':
      return { title: t('preparingTitle'), body: t('preparingBody'), activeStep: 2 };
    case 'ready':
      return { title: t('readyTitle'), body: t('readyBody'), activeStep: 3 };
    case 'served':
      return { title: t('servedTitle'), body: t('servedBody'), activeStep: 4 };
    case 'waiting_payment':
      return { title: t('waitingPaymentTitle'), body: t('waitingPaymentBody'), activeStep: 5 };
    case 'paid':
      return { title: t('paidTitle'), body: t('paidBody'), activeStep: 5 };
    case 'cancelled':
    default:
      return { title: t('cancelledTitle'), body: t('cancelledBody'), activeStep: 1 };
  }
}

export function CustomerStatus({
  tableCode,
  orderId,
  orderNumber,
  icon,
  onAddMore,
  locale = 'id',
  onToggleLocale,
  t = (key) => key,
  onCallWaiter,
  waiterCalled = false,
}: CustomerStatusProps) {
  const [orderStatus, setOrderStatus] = useState<PublicOrderStatus | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let isActive = true;
    const loadStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
        if (!response.ok) return;
        const nextOrder = await response.json();
        if (isActive) setOrderStatus(nextOrder);
      } catch {
        // Keep the last visible state when a polling request drops.
      }
    };

    void loadStatus();
    const interval = window.setInterval(loadStatus, 5000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [orderId]);

  const currentStatus = orderStatus?.status ?? 'pending';
  const copy = getStatusDetails(currentStatus, t);
  const activeStep = copy.activeStep;
  const canAddMore = !['waiting_payment', 'paid', 'cancelled'].includes(currentStatus);
  const steps = customerTranslations[locale].steps;

  const helperText = useMemo(() => {
    if (!orderStatus) {
      return locale === 'id' ? 'Estimasi konfirmasi 2-3 mnt' : 'Estimated confirmation 2-3 min';
    }
    if (currentStatus === 'paid') {
      return t('paidTitle');
    }
    return `${orderStatus.itemCount} ${t('itemCount')}`;
  }, [currentStatus, orderStatus, locale, t]);

  return (
    <main className={styles['customer-page']}>
      <section className={styles['customer-status']}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
          {onToggleLocale && (
            <button
              type="button"
              className={styles['customer-lang-btn']}
              onClick={() => onToggleLocale(locale === 'id' ? 'en' : 'id')}
            >
              {locale === 'id' ? '🇬🇧 English' : '🇮🇩 Indonesia'}
            </button>
          )}
          {onCallWaiter && (
            <button
              type="button"
              className={`${styles['customer-call-btn']} ${waiterCalled ? styles.called : ''}`}
              onClick={onCallWaiter}
            >
              {waiterCalled ? t('callWaiterSent') : t('callWaiter')}
            </button>
          )}
        </div>

        <div className={styles['customer-status-icon']}>{icon}</div>
        <span className={styles['customer-pill']}>
          {t('table')} {tableCode.toUpperCase()}
        </span>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>

        <div className={styles['status-card']}>
          <span>{t('orderNumberLabel')}</span>
          <strong>{orderNumber}</strong>
          <small>{helperText}</small>
        </div>

        <div className={styles['status-steps']}>
          {steps.map((label, index) => (
            <div className={index + 1 <= activeStep ? styles.active : ''} key={label}>
              <b>{index + 1}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {canAddMore && (
          <Button className={styles['customer-primary']} onClick={onAddMore}>
            {t('addMoreButton')}
          </Button>
        )}
      </section>
    </main>
  );
}

import type { ReactNode } from 'react';
import styles from '../../table/[code]/Customer.module.css';
import { Button } from '../ui/Button';
import type { CustomerLocale, CustomerTranslationKey } from '../../table/[code]/customer-i18n';

type CustomerHeroProps = {
  tableCode: string;
  itemCount: number;
  orderIcon: ReactNode;
  onOpenOrder: () => void;
  cafeName?: string;
  isOrderingOpen?: boolean;
  locale?: CustomerLocale;
  onToggleLocale?: (locale: CustomerLocale) => void;
  t?: (key: CustomerTranslationKey) => string;
  onCallWaiter?: () => void;
  waiterCalled?: boolean;
};

export function CustomerHero({
  tableCode,
  itemCount,
  orderIcon,
  onOpenOrder,
  cafeName = 'POS',
  isOrderingOpen = true,
  locale = 'id',
  onToggleLocale,
  t = (key) => key,
  onCallWaiter,
  waiterCalled = false,
}: CustomerHeroProps) {
  return (
    <header className={styles['customer-hero']}>
      <div>
        <div className={styles['customer-topline']}>
          <span className={styles['customer-pill']}>
            {t('table')} {tableCode.toUpperCase()}
          </span>
          <span className={styles['customer-open']}>
            {isOrderingOpen ? t('openNow') : t('orderingPaused')}
          </span>
          {onToggleLocale && (
            <button
              type="button"
              className={styles['customer-lang-btn']}
              onClick={() => onToggleLocale(locale === 'id' ? 'en' : 'id')}
              title="Ganti Bahasa / Switch Language"
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
        <h1>{cafeName}</h1>
        <p>{t('heroSubtitle')}</p>
        <div className={styles['customer-hero-meta']}>
          <span>{t('avgServe')}</span>
          <span>{t('noQueue')}</span>
        </div>
      </div>
      <Button className={styles['cart-fab']} variant="secondary" onClick={onOpenOrder}>
        <span>{itemCount}</span>
        {orderIcon}
        {t('orderFab')}
      </Button>
    </header>
  );
}

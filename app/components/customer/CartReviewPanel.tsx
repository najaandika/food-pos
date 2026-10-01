import { Button } from '../ui/Button';
import { CartItemRow } from './CartItemRow';
import { OrderSummary } from './OrderSummary';
import type { CustomerCartItem } from './types';
import styles from '../../table/[code]/Customer.module.css';
import type { CustomerTranslationKey } from '../../table/[code]/customer-i18n';

type CartReviewPanelProps = {
  tableCode: string;
  cart: CustomerCartItem[];
  itemCount: number;
  customerName: string;
  orderNote: string;
  subtotal: string;
  tax: string;
  taxLabel: string;
  service: string;
  serviceLabel: string;
  showService: boolean;
  total: string;
  formatPrice: (value: number) => string;
  onChooseMenu: () => void;
  onCustomerNameChange: (value: string) => void;
  onOrderNoteChange: (value: string) => void;
  onItemNoteChange: (id: number, value: string) => void;
  onItemDecrement: (id: number) => void;
  onItemIncrement: (id: number) => void;
  onCheckout: () => void;
  submitting?: boolean;
  error?: string;
  requireCustomerName?: boolean;
  t?: (key: CustomerTranslationKey) => string;
};

export function CartReviewPanel({
  tableCode,
  cart,
  itemCount,
  customerName,
  orderNote,
  subtotal,
  tax,
  taxLabel,
  service,
  serviceLabel,
  showService,
  total,
  formatPrice,
  onChooseMenu,
  onCustomerNameChange,
  onOrderNoteChange,
  onItemNoteChange,
  onItemDecrement,
  onItemIncrement,
  onCheckout,
  submitting = false,
  error = '',
  requireCustomerName = true,
  t = (key) => key,
}: CartReviewPanelProps) {
  const checkoutDisabled = (requireCustomerName && !customerName.trim()) || submitting;

  return (
    <section className={styles['customer-cart']}>
      <div className={styles['cart-head']}>
        <div>
          <span>
            {t('table')} {tableCode.toUpperCase()}
          </span>
          <h2>{t('reviewTitle')}</h2>
          <p>{t('reviewSubtitle')}</p>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className={styles['empty-cart']}>
          <h3>{t('emptyCartTitle')}</h3>
          <p>{t('emptyCartDesc')}</p>
          <Button className={styles['customer-primary']} onClick={onChooseMenu}>
            {t('chooseMenuButton')}
          </Button>
        </div>
      ) : (
        <>
          <div className={styles['cart-ticket-note']}>
            <span>{t('currentTicket')}</span>
            <strong>
              {itemCount} {t('itemsSelected')}
            </strong>
            <p>{t('ticketCheckHint')}</p>
          </div>
          <div className={styles['cart-list']}>
            {cart.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                formattedPrice={formatPrice(item.price)}
                onNoteChange={(note) => onItemNoteChange(item.id, note)}
                onDecrement={() => onItemDecrement(item.id)}
                onIncrement={() => onItemIncrement(item.id)}
                notePlaceholder={t('itemNotePlaceholder')}
              />
            ))}
          </div>

          <div className={styles['customer-form-panel']}>
            <label className={styles['customer-field']}>
              <span>
                {t('yourName')}
                {requireCustomerName ? '' : t('nameOptional')}
              </span>
              <input
                value={customerName}
                onChange={(event) => onCustomerNameChange(event.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </label>
            <label className={styles['customer-field']}>
              <span>{t('orderNote')}</span>
              <textarea
                value={orderNote}
                onChange={(event) => onOrderNoteChange(event.target.value)}
                placeholder={t('orderNotePlaceholder')}
                rows={3}
              />
            </label>
          </div>

          <OrderSummary
            subtotal={subtotal}
            subtotalLabel={t('subtotal')}
            tax={tax}
            taxLabel={taxLabel}
            service={service}
            serviceLabel={serviceLabel}
            showService={showService}
            total={total}
            totalLabel={t('total')}
          />

          {error && (
            <p className={styles['customer-checkout-error']} role="alert">
              {error}
            </p>
          )}
          {checkoutDisabled && !submitting && !error && (
            <p className={styles['customer-checkout-hint']}>{t('nameRequiredHint')}</p>
          )}

          <Button
            className={styles['customer-primary']}
            disabled={checkoutDisabled}
            onClick={onCheckout}
          >
            {submitting ? t('submittingButton') : t('checkoutButton')}
          </Button>
        </>
      )}
    </section>
  );
}

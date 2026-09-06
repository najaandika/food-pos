import styles from '../../table/[code]/Customer.module.css';

type OrderSummaryProps = {
  subtotal: string;
  tax: string;
  taxLabel: string;
  service?: string;
  serviceLabel?: string;
  showService?: boolean;
  total: string;
};

export function OrderSummary({
  subtotal,
  tax,
  taxLabel,
  service,
  serviceLabel,
  showService = false,
  total,
}: OrderSummaryProps) {
  return (
    <div className={styles['customer-summary']}>
      <p><span>Subtotal</span><strong>{subtotal}</strong></p>
      <p><span>{taxLabel}</span><strong>{tax}</strong></p>
      {showService && service && serviceLabel && <p><span>{serviceLabel}</span><strong>{service}</strong></p>}
      <p><span>Total</span><strong>{total}</strong></p>
    </div>
  );
}

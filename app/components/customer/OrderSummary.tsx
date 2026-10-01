import styles from '../../table/[code]/Customer.module.css';

type OrderSummaryProps = {
  subtotal: string;
  subtotalLabel?: string;
  tax: string;
  taxLabel: string;
  service?: string;
  serviceLabel?: string;
  showService?: boolean;
  total: string;
  totalLabel?: string;
};

export function OrderSummary({
  subtotal,
  subtotalLabel = 'Subtotal',
  tax,
  taxLabel,
  service,
  serviceLabel,
  showService = false,
  total,
  totalLabel = 'Total',
}: OrderSummaryProps) {
  return (
    <div className={styles['customer-summary']}>
      <p>
        <span>{subtotalLabel}</span>
        <strong>{subtotal}</strong>
      </p>
      <p>
        <span>{taxLabel}</span>
        <strong>{tax}</strong>
      </p>
      {showService && service && serviceLabel && (
        <p>
          <span>{serviceLabel}</span>
          <strong>{service}</strong>
        </p>
      )}
      <p>
        <span>{totalLabel}</span>
        <strong>{total}</strong>
      </p>
    </div>
  );
}

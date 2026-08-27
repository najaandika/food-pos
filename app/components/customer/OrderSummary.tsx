type OrderSummaryProps = {
  subtotal: string;
  service: string;
  total: string;
};

export function OrderSummary({ subtotal, service, total }: OrderSummaryProps) {
  return (
    <div className="customer-summary">
      <p><span>Subtotal</span><strong>{subtotal}</strong></p>
      <p><span>Service 5%</span><strong>{service}</strong></p>
      <p><span>Total</span><strong>{total}</strong></p>
    </div>
  );
}

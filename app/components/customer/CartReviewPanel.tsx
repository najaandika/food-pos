import { Button } from '../ui/Button';
import { CartItemRow } from './CartItemRow';
import { OrderSummary } from './OrderSummary';
import type { CustomerCartItem } from './types';

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
}: CartReviewPanelProps) {
  const checkoutDisabled = (requireCustomerName && !customerName.trim()) || submitting;

  return (
    <section className="customer-cart">
      <div className="cart-head">
        <div>
          <span>Table {tableCode.toUpperCase()}</span>
          <h2>Review Order</h2>
          <p>Confirm your items before we send them to staff.</p>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <h3>Your cart is empty</h3>
          <p>Add your favorite menu first.</p>
          <Button className="customer-primary" onClick={onChooseMenu}>Choose menu</Button>
        </div>
      ) : (
        <>
          <div className="cart-ticket-note">
            <span>Current ticket</span>
            <strong>{itemCount} item{itemCount > 1 ? 's' : ''} selected</strong>
            <p>Check quantity and notes before sending to staff.</p>
          </div>
          <div className="cart-list">
            {cart.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                formattedPrice={formatPrice(item.price)}
                onNoteChange={(note) => onItemNoteChange(item.id, note)}
                onDecrement={() => onItemDecrement(item.id)}
                onIncrement={() => onItemIncrement(item.id)}
              />
            ))}
          </div>

          <div className="customer-form-panel">
            <label className="customer-field">
              <span>Your name{requireCustomerName ? '' : ' (optional)'}</span>
              <input value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} placeholder="Input your name" />
            </label>
            <label className="customer-field">
              <span>Order note</span>
              <textarea value={orderNote} onChange={(event) => onOrderNoteChange(event.target.value)} placeholder="Any note for waiters?" rows={3} />
            </label>
          </div>

          <OrderSummary subtotal={subtotal} tax={tax} taxLabel={taxLabel} service={service} serviceLabel={serviceLabel} showService={showService} total={total} />

          {error && <p className="customer-checkout-error" role="alert">{error}</p>}

          <Button className="customer-primary" disabled={checkoutDisabled} onClick={onCheckout}>{submitting ? 'Sending Order...' : 'Checkout Order'}</Button>
        </>
      )}
    </section>
  );
}

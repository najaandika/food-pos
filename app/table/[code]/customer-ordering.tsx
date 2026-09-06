'use client';

import { Check, ReceiptText, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './Customer.module.css';
import { CartReviewPanel } from '../../components/customer/CartReviewPanel';
import { BottomOrderBar } from '../../components/customer/BottomOrderBar';
import { CustomerHero } from '../../components/customer/CustomerHero';
import { CustomerStatus } from '../../components/customer/CustomerStatus';
import { MenuCard } from '../../components/customer/MenuCard';
import { customerCategories, customerMenuItems } from '../../components/customer/data';
import type { CustomerCartItem, CustomerMenuItem } from '../../components/customer/types';
import { Button } from '../../components/ui/Button';
import { PillTabs } from '../../components/ui/PillTabs';
import { SearchField } from '../../components/ui/SearchField';
import { formatRupiah } from '../../lib/format';
import type { PosSettings, PosSnapshot } from '../../../lib/pos-types';

export default function CustomerOrdering({ tableCode }: { tableCode: string }) {
  const [activeCategory, setActiveCategory] = useState('Coffee');
  const [cart, setCart] = useState<CustomerCartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [step, setStep] = useState<'menu' | 'cart' | 'status'>('menu');
  const [menuItems, setMenuItems] = useState<CustomerMenuItem[]>(customerMenuItems);
  const [orderNumber, setOrderNumber] = useState(`BB-${tableCode.toUpperCase()}-1024`);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [settings, setSettings] = useState<PosSettings | null>(null);
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const response = await fetch('/api/pos', { cache: 'no-store' });
        if (!response.ok) return;
        const snapshot: PosSnapshot = await response.json();
        setSettings(snapshot.settings);
        const activeItems = snapshot.menuItems
          .filter((item) => item.isAvailable)
          .map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            description: item.description,
            price: item.price,
            badge: item.badge ?? (item.isBestSeller ? 'Best Seller' : undefined),
            image: item.imageUrl,
            available: item.isAvailable,
          }));

        if (activeItems.length) {
          setMenuItems(activeItems);
          const first = activeItems[0];
          if (first) setActiveCategory(first.category);
        }
      } catch (error) {
        console.warn('Using fallback customer menu.', error);
      }
    };

    void loadMenu();
  }, []);

  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const categories = useMemo(() => {
    const names = Array.from(new Set(menuItems.map((item) => item.category)));
    return names.length ? names : [...customerCategories];
  }, [menuItems]);
  const filteredMenu = useMemo(() => menuItems.filter((item) => item.category === activeCategory), [activeCategory, menuItems]);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const taxRate = settings?.tax.taxRate ?? 5;
  const serviceRate = settings?.tax.serviceRate ?? 0;
  const tax = Math.round(subtotal * (taxRate / 100));
  const service = Math.round(subtotal * (serviceRate / 100));
  const total = subtotal + tax + service;
  const qrOrderingOpen = settings?.qrOptions.guestOrdering !== false;
  const requireCustomerName = settings?.qrOptions.customerName !== false;
  const getCartQuantity = (id: number) => cart.find((item) => item.id === id)?.quantity ?? 0;

  const addToCart = (item: CustomerMenuItem) => {
    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.id === item.id);
      if (existing) {
        return current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem);
      }

      return [...current, { ...item, quantity: 1, note: '' }];
    });
  };

  const updateQuantity = (id: number, change: number) => {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: item.quantity + change } : item)
      .filter((item) => item.quantity > 0));
  };

  const updateNote = (id: number, note: string) => {
    setCart((current) => current.map((item) => item.id === id ? { ...item, note } : item));
  };

  const checkout = async () => {
    if (!cart.length || submitting) return;
    if (requireCustomerName && !customerName.trim()) return;
    setSubmitting(true);
    setCheckoutError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableCode,
          customerName: customerName || `Table ${tableCode}`,
          notes: orderNote,
          items: cart.map((item) => ({ menuItemId: item.id, quantity: item.quantity, notes: item.note })),
        }),
      });

      if (response.ok) {
        const order = await response.json();
        setOrderId(order.id);
        setOrderNumber(order.orderNumber);
        setStep('status');
        return;
      }

      const error = await response.json().catch(() => ({ error: 'Failed to send order' }));
      setCheckoutError(error.error ?? 'Failed to send order');
    } catch {
      setCheckoutError('Connection problem. Please ask staff for help.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'status') {
    return (
      <CustomerStatus
        tableCode={tableCode}
        orderId={orderId}
        orderNumber={orderNumber}
        icon={<Check />}
        onAddMore={() => setStep('menu')}
      />
    );
  }

  return (
    <main ref={pageRef} className={styles['customer-page']}>
      <CustomerHero
        tableCode={tableCode}
        itemCount={itemCount}
        orderIcon={<ReceiptText />}
        onOpenOrder={() => setStep('cart')}
        cafeName={settings?.profile.cafeName}
        isOrderingOpen={qrOrderingOpen}
      />

      {!qrOrderingOpen ? (
        <section className={`${styles['customer-cart']} ${styles['customer-paused']}`}>
          <div className={styles['cart-ticket-note']}>
            <span>Ordering paused</span>
            <strong>QR menu is temporarily closed</strong>
            <p>Please ask our staff to help create your order from the POS counter.</p>
          </div>
        </section>
      ) : step === 'menu' ? (
        <>
          <section className={styles['customer-quick-panel']}>
            <SearchField className={styles['customer-search']} placeholder="Search coffee, food, or snack" icon={<Search />} />
            <div className={styles['customer-promo']}>
              <span>Today</span>
              <strong>Free refill water at your table</strong>
              <small>Ask waiters from your order note.</small>
            </div>
          </section>

          <PillTabs
            className={styles['customer-categories']}
            items={categories}
            value={activeCategory}
            label="Menu categories"
            onChange={setActiveCategory}
          />

          <section className={styles['customer-section-head']}>
            <div>
              <h2>{activeCategory}</h2>
              <p>{filteredMenu.length} menus available</p>
            </div>
            <span>Popular first</span>
          </section>

          <section className={styles['customer-menu-list']}>
            {filteredMenu.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                quantity={getCartQuantity(item.id)}
                formattedPrice={formatRupiah(item.price)}
                onAdd={() => addToCart(item)}
                onRemove={() => updateQuantity(item.id, -1)}
              />
            ))}
          </section>

          {itemCount > 0 && (
            <BottomOrderBar itemCount={itemCount} total={formatRupiah(total)} icon={<ReceiptText />} onReview={() => setStep('cart')} />
          )}
        </>
      ) : (
        <CartReviewPanel
          tableCode={tableCode}
          cart={cart}
          itemCount={itemCount}
          customerName={customerName}
          orderNote={orderNote}
          subtotal={formatRupiah(subtotal)}
          tax={formatRupiah(tax)}
          taxLabel={`Tax (${taxRate}%)`}
          service={formatRupiah(service)}
          serviceLabel={`Service (${serviceRate}%)`}
          showService={serviceRate > 0}
          total={formatRupiah(total)}
          formatPrice={formatRupiah}
          onChooseMenu={() => setStep('menu')}
          onCustomerNameChange={setCustomerName}
          onOrderNoteChange={setOrderNote}
          onItemNoteChange={updateNote}
          onItemDecrement={(id) => updateQuantity(id, -1)}
          onItemIncrement={(id) => updateQuantity(id, 1)}
          onCheckout={checkout}
          submitting={submitting}
          error={checkoutError}
          requireCustomerName={requireCustomerName}
        />
      )}
    </main>
  );
}

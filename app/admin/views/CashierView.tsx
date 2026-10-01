'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banknote, CheckCircle2, CreditCard, Printer, QrCode, Receipt, RefreshCw, Search, Tag, X } from 'lucide-react';

import { AdminTitle, orders as fallbackOrders } from '..';
import { formatRupiah } from '../../lib/format';
import type { AdminOrder } from '../runtime-data';
import type { PosSettings } from '../../../lib/pos-types';

import { roleLabel, type AuthUser } from '../auth';
import { useLocale } from '../i18n-context';

type PaymentMethod = 'cash' | 'qris' | 'transfer';
type CashierFilter = 'all' | 'ready' | 'qr' | 'takeaway';
type DiscountOption = 'none' | '10' | '15' | '20' | 'v10k' | 'v20k';

const payableStatuses = ['ready', 'served', 'waiting_payment'] as const;

export function CashierView({
  orders = fallbackOrders,
  settings,
  onMarkPaid,
  user,
  onLogout,
}: {
  orders?: AdminOrder[];
  settings?: PosSettings;
  onMarkPaid?: (id: number, method?: PaymentMethod) => void;
  user?: AuthUser;
  onLogout?: () => void;
}) {
  const { locale, t } = useLocale();

  const formatSource = (source?: AdminOrder['source']) => {
    return source === 'manual' ? t('orders.manualOrder') : t('orders.qrTableOrdering');
  };

  const [selectedId, setSelectedId] = useState<number | undefined>(orders[0]?.id);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CashierFilter>('all');
  const [mobileTab, setMobileTab] = useState<'queue' | 'detail'>('queue');

  // Interactive Payment & Discount States
  const [discount, setDiscount] = useState<DiscountOption>('none');
  const [customCashInput, setCustomCashInput] = useState<string>('');
  const [cashPreset, setCashPreset] = useState<'pas' | 'exact' | number>('pas');
  const [showQrisModal, setShowQrisModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [qrisTimer, setQrisTimer] = useState<number>(300); // 5 mins countdown

  const paymentQueue = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const isPayable = order.rawStatus ? payableStatuses.includes(order.rawStatus as (typeof payableStatuses)[number]) : true;
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'ready' && ['ready', 'served', 'waiting_payment'].includes(order.rawStatus ?? '')) ||
        (activeFilter === 'qr' && order.source === 'qr') ||
        (activeFilter === 'takeaway' && order.type === 'takeaway');
      const matchesQuery =
        !normalizedQuery ||
        order.name.toLowerCase().includes(normalizedQuery) ||
        order.table.toLowerCase().includes(normalizedQuery) ||
        order.meta.toLowerCase().includes(normalizedQuery);
      return isPayable && matchesFilter && matchesQuery;
    });
  }, [activeFilter, orders, query]);

  const selectedOrder = paymentQueue.find((order) => order.id === selectedId) ?? paymentQueue[0];
  const selectedPayable = selectedOrder?.rawStatus ? payableStatuses.includes(selectedOrder.rawStatus as (typeof payableStatuses)[number]) : false;
  
  // Dynamic Financial Calculations
  const rawSubtotal = selectedOrder?.rawSubtotal ?? selectedOrder?.rawTotal ?? 0;
  
  const discountAmount = useMemo(() => {
    if (discount === '10') return Math.round(rawSubtotal * 0.1);
    if (discount === '15') return Math.round(rawSubtotal * 0.15);
    if (discount === '20') return Math.round(rawSubtotal * 0.2);
    if (discount === 'v10k') return Math.min(10000, rawSubtotal);
    if (discount === 'v20k') return Math.min(20000, rawSubtotal);
    return 0;
  }, [discount, rawSubtotal]);

  const subtotal = Math.max(0, rawSubtotal - discountAmount);
  const taxRate = settings?.tax.taxRate ?? 5;
  const serviceRate = settings?.tax.serviceRate ?? 0;
  const tax = Math.round(subtotal * (taxRate / 100));
  const serviceCharge = Math.round(subtotal * (serviceRate / 100));
  const total = subtotal + tax + serviceCharge;

  // Cash Presets calculation
  const defaultMinCash = Math.ceil(total / 10000) * 10000;
  const cashReceived = useMemo(() => {
    if (method !== 'cash') return total;
    if (cashPreset === 'pas') return total;
    if (typeof cashPreset === 'number') return cashPreset;
    if (customCashInput) {
      const parsed = parseInt(customCashInput.replace(/\D/g, ''), 10);
      return isNaN(parsed) ? total : parsed;
    }
    return defaultMinCash;
  }, [cashPreset, customCashInput, defaultMinCash, method, total]);

  const change = Math.max(0, cashReceived - total);

  const cashPresetOptions = useMemo(() => {
    const baseExact = total;
    const round50k = Math.ceil((total + 1) / 50000) * 50000;
    const round100k = Math.ceil((total + 1) / 100000) * 100000;
    const round200k = Math.ceil((total + 1) / 200000) * 200000;
    const presets = Array.from(new Set([baseExact, round50k, round100k, round200k])).filter((val) => val >= total);
    return presets;
  }, [total]);

  const paymentOptions = useMemo(() => ([
    { key: 'cash' as const, label: t('cashier.cash'), icon: Banknote, enabled: settings?.payments.cash ?? true },
    { key: 'qris' as const, label: t('cashier.qris'), icon: QrCode, enabled: settings?.payments.qris ?? true },
    { key: 'transfer' as const, label: t('cashier.transfer'), icon: CreditCard, enabled: settings?.payments.transfer ?? false },
  ]).filter((option) => option.enabled), [settings, t]);

  const paidToday = orders.filter((order) => order.rawStatus === 'paid');
  const cashierStats = [
    { label: t('cashier.unpaidBills'), value: String(paymentQueue.length), hint: `${paymentQueue.filter((order) => order.rawStatus === 'waiting_payment').length} ${t('cashier.waitingPayment')}` },
    { label: t('cashier.shiftSalesToday'), value: formatRupiah(paidToday.reduce((sum, order) => sum + (order.rawTotal ?? 0), 0)), hint: `${paidToday.length} ${t('orders.all')}` },
    { label: t('cashier.cashInDrawer'), value: formatRupiah(paidToday.filter((order) => order.paymentMethod === 'cash').reduce((sum, order) => sum + (order.rawTotal ?? 0), 0)), hint: t('cashier.cashPayments') },
  ];

  useEffect(() => {
    if (!paymentOptions.some((option) => option.key === method)) {
      setMethod(paymentOptions[0]?.key ?? 'cash');
    }
  }, [method, paymentOptions]);

  useEffect(() => {
    setDiscount('none');
    setCustomCashInput('');
    setCashPreset('pas');
  }, [selectedOrder?.id]);

  // QRIS Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showQrisModal && qrisTimer > 0) {
      timer = setInterval(() => setQrisTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [showQrisModal, qrisTimer]);

  const handleProcessPayment = () => {
    if (!selectedOrder?.id) return;
    if (method === 'qris') {
      setQrisTimer(300);
      setShowQrisModal(true);
    } else {
      confirmMarkPaid();
    }
  };

  const confirmMarkPaid = () => {
    if (!selectedOrder?.id) return;
    onMarkPaid?.(selectedOrder.id, method);
    setShowQrisModal(false);
    
    // Auto advance selection to next unpaid bill
    const currentIndex = paymentQueue.findIndex((o) => o.id === selectedOrder.id);
    const nextUnpaid = paymentQueue.find((o, idx) => idx > currentIndex && o.rawStatus !== 'paid') ?? paymentQueue.find((o) => o.id !== selectedOrder.id && o.rawStatus !== 'paid');
    if (nextUnpaid?.id) {
      setSelectedId(nextUnpaid.id);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title={t('cashier.title')} subtitle={t('cashier.subtitle')} user={user} onLogout={onLogout} />
        <div className="cashier-shift"><span>{t('cashier.shiftLabel')}</span><strong>{t('cashier.eveningShift')} - {user?.name ?? 'Gladina'}</strong></div>
      </header>

      {/* Mobile Screen Navigation Segmented Switcher */}
      <div className="cashier-mobile-tabs" role="tablist">
        <button
          className={`cashier-tab-btn ${mobileTab === 'queue' ? 'active' : ''}`}
          type="button"
          onClick={() => setMobileTab('queue')}
        >
          {t('cashier.paymentQueue')} ({paymentQueue.length})
        </button>
        <button
          className={`cashier-tab-btn ${mobileTab === 'detail' ? 'active' : ''}`}
          type="button"
          onClick={() => setMobileTab('detail')}
        >
          {t('cashier.billDetail')}
        </button>
      </div>

      <div className="cashier-layout">
        <section className={`cashier-feed ${mobileTab === 'detail' ? 'mobile-hidden' : ''}`}>
          <div className="cashier-summary">
            {cashierStats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.hint}</small>
              </article>
            ))}
          </div>

          <div className="cashier-panel">
            <div className="cashier-panel-head">
              <div><h2>{t('cashier.paymentQueue')}</h2><p>{t('cashier.readyForPayment')}</p></div>
              <span className="cashier-queue-count">{paymentQueue.length} {t('orders.all')}</span>
            </div>
            <div className="cashier-toolbar">
              <div className="owner-filter-tabs">
                {[
                  ['all', t('cashier.allBills')],
                  ['ready', t('cashier.readyBills')],
                  ['qr', t('cashier.qrBills')],
                  ['takeaway', t('cashier.takeawayBills')],
                ].map(([value, label]) => (
                  <button className={activeFilter === value ? 'active' : ''} type="button" key={value} onClick={() => setActiveFilter(value as CashierFilter)}>
                    {label}
                  </button>
                ))}
              </div>
              <label className="admin-search-wrap">
                <input type="search" placeholder={t('cashier.searchBill')} value={query} onChange={(event) => setQuery(event.target.value)} />
                <Search aria-hidden="true" />
              </label>
            </div>

            <div className="cashier-order-list">
              {paymentQueue.map((order) => (
                <button
                  className={`cashier-order-row ${order.id === selectedOrder?.id ? 'active' : ''}`}
                  type="button"
                  key={order.id ?? `${order.table}-${order.name}`}
                  onClick={() => {
                    setSelectedId(order.id);
                    setMobileTab('detail');
                  }}
                >
                  <span className={`table-pill ${order.tone}`}>{order.table}</span>
                  <div>
                    <strong>{order.name}</strong>
                    <small>{order.meta}</small>
                    <i>{formatSource(order.source)}</i>
                  </div>
                  <em className={order.statusTone}>{order.status}</em>
                  <span className="cashier-row-time">{order.time}</span>
                  <b>{order.total}</b>
                </button>
              ))}
              {paymentQueue.length === 0 && <p className="empty-state">{t('cashier.noOrders')}</p>}
            </div>
          </div>
        </section>

        <aside className={`cashier-detail ${mobileTab === 'queue' ? 'mobile-hidden' : ''}`}>
          <div className="cashier-detail-top">
            <div className="cashier-customer-head">
              <span className="cashier-ticket-mark">{selectedOrder?.orderNumber?.replace('POS-', '#') ?? '—'}</span>
              <div>
                {selectedOrder && (
                  <span className={`mini-status ${selectedOrder.rawStatus === 'paid' ? 'paid' : 'ready'}`}>
                    {selectedOrder.rawStatus === 'paid' ? t('status.paid') : t('cashier.readyBills')}
                  </span>
                )}
                <h2>{selectedOrder?.name ?? t('cashier.selectOrder')}</h2>
                <p>{selectedOrder?.meta} - {selectedOrder?.time}</p>
              </div>
            </div>
            <span className="cashier-table-badge"><small>{t('common.table')}</small><strong>{selectedOrder?.table ?? '-'}</strong></span>
          </div>

          <div className="payment-due-card">
            <span>{t('cashier.amountDue')}</span>
            <strong>{formatRupiah(total)}</strong>
            <small>{locale === 'id' ? 'Termasuk pajak, servis & diskon yang berlaku' : 'Includes tax, service & applied discounts'}</small>
          </div>

          <div className="cashier-note-grid">
            <article><span>{t('orders.source')}</span><strong>{formatSource(selectedOrder?.source)}</strong></article>
            <article><span>{locale === 'id' ? 'Status Pembayaran' : 'Payment Status'}</span><strong>{selectedOrder?.rawStatus === 'paid' ? t('status.paid') : t('orders.unpaid')}</strong></article>
          </div>

          {/* Quick Discount Selector */}
          <div className="cashier-discount-box">
            <div className="cashier-discount-title">
              <Tag aria-hidden="true" size={15} />
              <span>{t('cashier.discountVoucher')}</span>
            </div>
            <div className="cashier-discount-chips">
              {[
                ['none', t('cashier.noDiscount')],
                ['10', '10% Off'],
                ['15', '15% Off'],
                ['20', '20% Off'],
                ['v10k', '-Rp 10k'],
                ['v20k', '-Rp 20k'],
              ].map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  className={`discount-chip ${discount === key ? 'active' : ''}`}
                  onClick={() => setDiscount(key as DiscountOption)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="cashier-section-title">
            <h3>{t('cashier.billItems')}</h3>
            <span>{selectedOrder?.items.length ?? 0} {t('common.items')}</span>
          </div>

          <div className="cashier-items">
            {(selectedOrder?.items ?? []).map(([name, qty, price], index) => (
              <div key={`${selectedOrder?.id ?? selectedOrder?.orderNumber}-${name}-${index}`}>
                <span>{name}</span>
                <b>x{qty}</b>
                <strong>{price}</strong>
              </div>
            ))}
          </div>

          <div className="cashier-bill">
            <p><span>{t('cashier.subtotal')}</span><strong>{formatRupiah(rawSubtotal)}</strong></p>
            {discountAmount > 0 && (
              <p className="cashier-discount-row">
                <span>{t('cashier.discount')}</span>
                <strong className="text-discount">-{formatRupiah(discountAmount)}</strong>
              </p>
            )}
            <p><span>{t('cashier.tax')} ({taxRate}%)</span><strong>{formatRupiah(tax)}</strong></p>
            {(serviceRate > 0 || serviceCharge > 0) && <p><span>{t('cashier.serviceCharge')} ({serviceRate}%)</span><strong>{formatRupiah(serviceCharge)}</strong></p>}
            <p className="cashier-bill-total"><span>{t('cashier.grandTotal')}</span><strong>{formatRupiah(total)}</strong></p>
          </div>

          {/* Payment Method Selector */}
          <div className="payment-methods">
            <h3>{t('cashier.paymentMethod')}</h3>
            <div>
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button className={method === option.key ? 'active' : ''} type="button" key={option.key} onClick={() => setMethod(option.key)}>
                    <Icon aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Cash Presets (Only visible when method is Cash) */}
          {method === 'cash' && (
            <div className="cashier-quick-cash">
              <span>{t('cashier.quickCash')}</span>
              <div className="cash-preset-grid">
                <button
                  type="button"
                  className={`cash-preset-btn ${cashPreset === 'pas' ? 'active' : ''}`}
                  onClick={() => {
                    setCashPreset('pas');
                    setCustomCashInput('');
                  }}
                >
                  {t('cashier.exactAmount')}
                </button>
                {cashPresetOptions.map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    className={`cash-preset-btn ${cashPreset === amt ? 'active' : ''}`}
                    onClick={() => {
                      setCashPreset(amt);
                      setCustomCashInput('');
                    }}
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
              </div>
              <div className="custom-cash-wrap">
                <input
                  type="text"
                  placeholder={t('cashier.customAmount')}
                  value={customCashInput}
                  onChange={(e) => {
                    setCustomCashInput(e.target.value);
                    setCashPreset('exact');
                  }}
                />
              </div>
            </div>
          )}

          <div className="cashier-tendered">
            <p><span>{method === 'cash' ? (locale === 'id' ? 'Uang Diterima' : 'Cash Received') : (locale === 'id' ? 'Dibayarkan' : 'Tendered')}</span><strong>{formatRupiah(cashReceived)}</strong></p>
            <p><span>{t('cashier.change')}</span><strong className={change > 0 ? 'text-change' : ''}>{formatRupiah(change)}</strong></p>
          </div>

          <div className="cashier-actions">
            <button type="button" disabled={!selectedOrder?.id} onClick={() => setShowReceiptModal(true)}>
              <Printer aria-hidden="true" size={16} /> {t('cashier.printBill')}
            </button>
            <button
              type="button"
              disabled={!selectedOrder?.id || !selectedPayable || paymentOptions.length === 0}
              onClick={handleProcessPayment}
            >
              {method === 'qris' ? (locale === 'id' ? 'Proses QRIS' : 'Process QRIS') : t('cashier.markAsPaid')}
            </button>
          </div>
        </aside>
      </div>

      {/* QRIS Interactive Payment Modal */}
      {showQrisModal && (
        <div className="admin-modal-overlay" onClick={() => setShowQrisModal(false)}>
          <div className="qris-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="qris-modal-close" type="button" onClick={() => setShowQrisModal(false)}>
              <X size={20} />
            </button>

            <div className="qris-modal-header">
              <span className="qris-badge"><QrCode size={20} /> QRIS Dynamic POS</span>
              <h2>Scan & Pay QRIS</h2>
              <p>{locale === 'id' ? 'Minta pelanggan scan QRIS dengan aplikasi e-Wallet atau Mobile Banking.' : 'Ask customer to scan QRIS with an e-Wallet or Mobile Banking app.'}</p>
            </div>

            <div className="qris-graphic-card">
              <div className="qris-brand-bar">
                <strong>QRIS</strong>
                <small>GPN Standard</small>
              </div>
              <div className="qris-svg-wrap">
                {/* SVG Mock QR Code Pattern */}
                <svg viewBox="0 0 200 200" width="180" height="180" className="qris-svg">
                  <rect width="200" height="200" fill="#ffffff" />
                  {/* Position detection patterns */}
                  <rect x="10" y="10" width="50" height="50" fill="#1F2B59" />
                  <rect x="20" y="20" width="30" height="30" fill="#ffffff" />
                  <rect x="25" y="25" width="20" height="20" fill="#1F2B59" />

                  <rect x="140" y="10" width="50" height="50" fill="#1F2B59" />
                  <rect x="150" y="20" width="30" height="30" fill="#ffffff" />
                  <rect x="155" y="25" width="20" height="20" fill="#1F2B59" />

                  <rect x="10" y="140" width="50" height="50" fill="#1F2B59" />
                  <rect x="20" y="150" width="30" height="30" fill="#ffffff" />
                  <rect x="25" y="155" width="20" height="20" fill="#1F2B59" />

                  {/* QR Data Grid simulation */}
                  <path
                    d="M70 10h20v20H70zm30 0h20v10h-20zm0 20h30v10h-30zm-30 20h20v20H70zm30 10h10v20h-10zm20 0h10v10h-10zm20-30h10v30h-10zm-60 40h30v10H70zm40 0h20v30h-20zm-30 20h20v20H80zm50-10h10v30h-10zm20-10h20v10h-20zm-20 30h30v20h-30zm-90 0h20v10H60zm0 20h10v20H60zm20 0h30v10H80zm-10 10h20v10H70zm40-10h30v20h-30zm40 0h20v20h-20z"
                    fill="#3047FF"
                  />
                </svg>
              </div>

              <div className="qris-amount-tag">
                <span>{locale === 'id' ? 'Total Pembayaran' : 'Total Payment'}</span>
                <strong>{formatRupiah(total)}</strong>
              </div>

              <div className="qris-timer-pill">
                <RefreshCw size={14} className="spin-icon" />
                <span>{t('cashier.expiresIn')} {formatTimer(qrisTimer)}</span>
              </div>
            </div>

            <div className="qris-modal-actions">
              <button type="button" className="qris-cancel-btn" onClick={() => setShowQrisModal(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="qris-confirm-btn" onClick={confirmMarkPaid}>
                <CheckCircle2 size={18} /> {locale === 'id' ? 'Simulasi Pembayaran Sukses' : 'Simulate Payment Success'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Thermal Receipt 80mm Modal */}
      {showReceiptModal && selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="receipt-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <div className="receipt-modal-title">
                <Receipt size={20} />
                <h3>{locale === 'id' ? 'Struk Pembayaran POS' : 'POS Payment Receipt'}</h3>
              </div>
              <button className="receipt-modal-close" type="button" onClick={() => setShowReceiptModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Print Area - Clean Thermal Paper Format */}
            <div className="receipt-paper" id="printable-pos-receipt">
              <div className="receipt-center-head">
                <h2>NAJA RESTO & CAFE</h2>
                <p>Jl. Kuliner No. 88, Jakarta Selatan</p>
                <p>Telp: (021) 555-0199 / 0812-3456-7890</p>
                <div className="receipt-divider-dash"></div>
              </div>

              <div className="receipt-meta-grid">
                <div><span>{locale === 'id' ? 'No Struk' : 'Receipt No'}:</span><strong>{selectedOrder.orderNumber ?? `#POS-${selectedOrder.id}`}</strong></div>
                <div><span>{locale === 'id' ? 'Tanggal' : 'Date'}:</span><strong>{new Date().toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })} {selectedOrder.time}</strong></div>
                <div><span>{t('nav.cashier')}:</span><strong>{user?.name ?? 'Gladina (Shift Evening)'}</strong></div>
                <div><span>{locale === 'id' ? 'Meja / Tipe' : 'Table / Type'}:</span><strong>{selectedOrder.table} ({selectedOrder.type === 'takeaway' ? t('menu.takeaway') : t('menu.dineIn')})</strong></div>
                <div><span>{locale === 'id' ? 'Pelanggan' : 'Customer'}:</span><strong>{selectedOrder.name}</strong></div>
              </div>

              <div className="receipt-divider-dash"></div>

              <table className="receipt-table">
                <thead>
                  <tr>
                    <th className="th-left">Item</th>
                    <th className="th-center">Qty</th>
                    <th className="th-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items ?? []).map(([name, qty, price], idx) => (
                    <tr key={idx}>
                      <td className="td-left">{name}</td>
                      <td className="td-center">x{qty}</td>
                      <td className="td-right">{price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-divider-dash"></div>

              <div className="receipt-totals">
                <div><span>{t('cashier.subtotal')}</span><strong>{formatRupiah(rawSubtotal)}</strong></div>
                {discountAmount > 0 && (
                  <div><span>{t('cashier.discount')} ({discount})</span><strong>-{formatRupiah(discountAmount)}</strong></div>
                )}
                <div><span>{t('cashier.tax')} ({taxRate}%)</span><strong>{formatRupiah(tax)}</strong></div>
                {serviceCharge > 0 && <div><span>{t('cashier.serviceCharge')} ({serviceRate}%)</span><strong>{formatRupiah(serviceCharge)}</strong></div>}
                <div className="receipt-grand-total">
                  <span>{t('cashier.grandTotal').toUpperCase()}</span>
                  <strong>{formatRupiah(total)}</strong>
                </div>
                <div className="receipt-payment-info">
                  <div><span>{t('cashier.paymentMethod')}:</span><strong className="text-uppercase">{method}</strong></div>
                  <div><span>{locale === 'id' ? 'Bayar / Tendered' : 'Paid / Tendered'}:</span><strong>{formatRupiah(cashReceived)}</strong></div>
                  <div><span>{t('cashier.change')}:</span><strong>{formatRupiah(change)}</strong></div>
                </div>
              </div>

              <div className="receipt-divider-dash"></div>

              <div className="receipt-footer">
                <p>{t('cashier.thankYou')}</p>
                <p>{locale === 'id' ? 'Silakan Datang Kembali' : 'Please Come Again'}</p>
                <div className="receipt-barcode-sim">||| | ||||| |||| || |||||| | |||</div>
                <small>Powered by Food POS Cloud System</small>
              </div>
            </div>

            <div className="receipt-modal-actions">
              <button type="button" className="receipt-btn-secondary" onClick={() => setShowReceiptModal(false)}>
                {t('common.close')}
              </button>
              <button
                type="button"
                className="receipt-btn-primary"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer size={18} /> {t('cashier.printReceipt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


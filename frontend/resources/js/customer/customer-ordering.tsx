import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../components/base/buttons/button';
import { SearchField } from '../../../components/base/search-field/search-field';
import { PillTab, PillTabList } from '../../../components/base/tabs/pill-tab';
import { BottomOrderBar } from './components/BottomOrderBar';
import { CartReviewPanel } from './components/CartReviewPanel';
import { CustomerHero } from './components/CustomerHero';
import { CustomerStatus } from './components/CustomerStatus';
import { MenuCard } from './components/MenuCard';
import type { CustomerCartItem, CustomerMenuItem } from './components/types';
import {
    customerTranslations,
    type CustomerLocale,
    type CustomerTranslationKey,
} from './customer-i18n';
import {
    addCartItem,
    canSubmitOrder,
    changeCartNote,
    changeCartQuantity,
    chooseCatalogCategory,
    createCheckoutPayload,
    filterCatalogItems,
    getCartSummary,
    mapCatalogItems,
    type QrCatalog,
} from './customer-ordering-model';
import './boardui-customer.css';

export type { QrCatalog } from './customer-ordering-model';

type OrderReceipt = {
    order_number: string;
    status: string;
    subtotal: string;
    tax: string;
    service_charge: string;
    total: string;
};

type Props = {
    token: string;
    csrfToken: string;
    initialMenu: QrCatalog;
};

function formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

function toMessage(body: unknown, fallback: string): string {
    if (!body || typeof body !== 'object') return fallback;
    const data = body as {
        message?: string;
        errors?: Record<string, string[]>;
    };
    const issue =
        data.errors && Object.values(data.errors).flat().find(Boolean);
    return issue || data.message || fallback;
}

export default function CustomerOrdering({
    token,
    csrfToken,
    initialMenu,
}: Props) {
    const [locale, setLocale] = useState<CustomerLocale>('id');
    const [catalog, setCatalog] = useState<QrCatalog>(initialMenu);
    const [category, setCategory] = useState(
        initialMenu.categories[0]?.name ?? '',
    );
    const [query, setQuery] = useState('');
    const [cart, setCart] = useState<CustomerCartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [guestCount, setGuestCount] = useState(1);
    const [orderNote, setOrderNote] = useState('');
    const [step, setStep] = useState<'menu' | 'cart' | 'status'>('menu');
    const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');
    const [catalogError, setCatalogError] = useState('');
    const pageRef = useRef<HTMLElement>(null);
    const receiptKey = 'food-pos-qr-receipt:' + token;

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem('pos-customer-locale');
            if (stored === 'id' || stored === 'en') setLocale(stored);
            const previous = window.sessionStorage.getItem(receiptKey);
            if (previous) {
                const result: OrderReceipt = JSON.parse(previous);
                if (result.order_number && result.total) {
                    setReceipt(result);
                    setStep('status');
                }
            }
        } catch {
            // Guest storage may be unavailable in private browsing.
        }
    }, [receiptKey]);

    useEffect(() => {
        pageRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    const t = (key: CustomerTranslationKey): string =>
        (customerTranslations[locale][key] as string) ?? key;
    const setLanguage = (next: CustomerLocale) => {
        setLocale(next);
        try {
            window.localStorage.setItem('pos-customer-locale', next);
        } catch {
            // Language is still active for this page.
        }
    };

    const menuItems = useMemo<CustomerMenuItem[]>(
        () => mapCatalogItems(catalog.categories),
        [catalog.categories],
    );

    const categories = useMemo(
        () => catalog.categories.map((entry) => entry.name),
        [catalog.categories],
    );
    const filteredMenu = useMemo(
        () => filterCatalogItems(menuItems, category, query),
        [menuItems, category, query],
    );

    const { itemCount, subtotal, estimatedTotal } = getCartSummary(cart);

    const addToCart = (item: CustomerMenuItem) => {
        if (!catalog.can_order || submitting) return;
        setCart((current) => addCartItem(current, item));
    };

    const updateQuantity = (id: number, change: number) => {
        setCart((current) => changeCartQuantity(current, id, change));
    };

    const updateNote = (id: number, note: string) => {
        setCart((current) => changeCartNote(current, id, note));
    };
    const refreshMenu = async () => {
        setCatalogError('');
        try {
            const response = await fetch(
                '/api/qr/' + encodeURIComponent(token) + '/menu',
                {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                    cache: 'no-store',
                    referrerPolicy: 'no-referrer',
                },
            );
            if (!response.ok) throw new Error('QR ' + response.status);
            const next: QrCatalog = await response.json();
            setCatalog(next);
            setCategory((previous) =>
                chooseCatalogCategory(next.categories, previous),
            );
            setCart([]);
        } catch {
            setCatalogError(
                locale === 'id'
                    ? 'Tidak dapat memperbarui menu. Periksa koneksi atau minta QR baru kepada petugas.'
                    : 'Unable to refresh the menu. Check your connection or request a new QR code.',
            );
        }
    };

    const checkout = async () => {
        if (
            !canSubmitOrder(
                submitting,
                catalog.can_order,
                cart,
                customerName,
                guestCount,
                catalog.table.seats,
            )
        )
            return;
        setSubmitting(true);
        setCheckoutError('');
        try {
            const response = await fetch(
                '/api/qr/' + encodeURIComponent(token) + '/orders',
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    referrerPolicy: 'no-referrer',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify(
                        createCheckoutPayload(
                            customerName,
                            guestCount,
                            orderNote,
                            cart,
                        ),
                    ),
                },
            );
            const body: unknown = await response.json().catch(() => null);
            if (response.ok) {
                const result = body as OrderReceipt;
                setReceipt(result);
                setStep('status');
                setCatalog((previous) => ({ ...previous, can_order: false }));
                try {
                    window.sessionStorage.setItem(
                        receiptKey,
                        JSON.stringify(result),
                    );
                } catch {
                    // The successful receipt remains visible in component state.
                }
                return;
            }
            if (response.status === 409) {
                setCatalog((previous) => ({ ...previous, can_order: false }));
            }
            const fallback =
                response.status === 409
                    ? 'Meja ini sedang digunakan dan tidak dapat menerima pesanan baru.'
                    : response.status === 419
                      ? 'Sesi telah kedaluwarsa. Muat ulang halaman lalu coba lagi.'
                      : 'Pesanan belum berhasil dikirim. Silakan periksa dan coba lagi.';
            setCheckoutError(toMessage(body, fallback));
        } catch {
            setCheckoutError(
                'Koneksi terputus. Periksa ke petugas sebelum mengirim ulang untuk menghindari pesanan ganda.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (step === 'status' && receipt) {
        return (
            <CustomerStatus
                tableCode={catalog.table.code}
                orderNumber={receipt.order_number}
                total={formatRupiah(Number(receipt.total))}
                locale={locale}
                onToggleLocale={setLanguage}
            />
        );
    }

    return (
        <main
            ref={pageRef}
            className="customer-boardui bg-background-full text-text-primary h-screen overflow-y-auto px-4 py-4 font-sans sm:px-6 sm:py-6"
        >
            <Head title="Pesan makanan - Food POS">
                <meta name="referrer" content="no-referrer" />
            </Head>
            <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-24">
                <CustomerHero
                    tableCode={catalog.table.code}
                    itemCount={itemCount}
                    onOpenOrder={() => setStep('cart')}
                    cafeName="Food POS"
                    isOrderingOpen={catalog.can_order}
                    locale={locale}
                    onToggleLocale={setLanguage}
                    t={t}
                />
                {!catalog.can_order ? (
                    <section className="border-border-button-default bg-background-primary-default rounded-3xl border p-6">
                        <strong className="text-title-3-semibold text-text-primary">
                            {t('orderingPaused')}
                        </strong>
                        <p className="text-body-regular text-text-secondary mt-1">
                            Meja ini belum tersedia untuk pesanan baru. Silakan
                            hubungi petugas restoran.
                        </p>
                    </section>
                ) : step === 'menu' ? (
                    <>
                        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.6fr)]">
                            <SearchField
                                fieldClassName="customer-input-focus"
                                id="customer-menu-search"
                                name="menuSearch"
                                placeholder={t('searchPlaceholder')}
                                aria-label={t('searchPlaceholder')}
                                value={query}
                                onChange={setQuery}
                            />
                            <div className="bg-background-secondary-default flex flex-col gap-1 rounded-2xl px-4 py-3">
                                <span className="text-caption-1-semibold text-text-primary/75">
                                    {locale === 'id'
                                        ? 'Informasi'
                                        : 'Information'}
                                </span>
                                <strong className="text-body-semibold text-text-primary">
                                    {locale === 'id'
                                        ? 'Pesan langsung dari meja'
                                        : 'Order from your table'}
                                </strong>
                                <small
                                    className="text-caption-1-regular"
                                    style={{
                                        color: 'color-mix(in srgb, var(--color-text-primary) 75%, transparent)',
                                    }}
                                >
                                    {locale === 'id'
                                        ? 'Pilih menu dan periksa ringkasan sebelum mengirim pesanan.'
                                        : 'Choose items and review the summary before submitting your order.'}
                                </small>
                            </div>
                        </section>
                        <PillTabList
                            className="bg-background-primary-default w-full overflow-x-auto rounded-xl p-1"
                            aria-label={t('categoriesLabel')}
                        >
                            {categories.map((item) => (
                                <PillTab
                                    key={item}
                                    variant="blue"
                                    isSelected={category === item}
                                    onSelect={() => setCategory(item)}
                                >
                                    {item}
                                </PillTab>
                            ))}
                        </PillTabList>
                        <section className="flex items-end justify-between gap-4">
                            <div>
                                <h2 className="text-title-2-semibold text-text-primary">
                                    {category || 'Menu'}
                                </h2>
                                <p className="text-body-regular text-text-secondary">
                                    {filteredMenu.length} {t('menusAvailable')}
                                </p>
                            </div>
                        </section>
                        {categories.length === 0 ? (
                            <section
                                className="border-border-button-default bg-background-primary-default text-body-regular text-text-secondary flex flex-col items-start gap-3 rounded-2xl border p-5"
                                role="status"
                            >
                                Belum ada menu yang tersedia untuk dipesan.
                                <Button
                                    variant="secondary"
                                    onClick={refreshMenu}
                                >
                                    Muat ulang menu
                                </Button>
                            </section>
                        ) : null}
                        {catalogError ? (
                            <p
                                className="bg-notification-error-background text-body-medium text-notification-error-foreground rounded-xl p-4"
                                role="alert"
                            >
                                {catalogError}
                            </p>
                        ) : null}
                        {categories.length > 0 && filteredMenu.length === 0 ? (
                            <p className="bg-background-secondary-default text-body-regular text-text-secondary rounded-2xl p-5">
                                {locale === 'id'
                                    ? 'Menu tidak ditemukan. Coba kata kunci lain.'
                                    : 'No menu items found. Try another search.'}
                            </p>
                        ) : null}
                        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredMenu.map((item) => (
                                <MenuCard
                                    key={item.id}
                                    item={item}
                                    quantity={
                                        cart.find(
                                            (entry) => entry.id === item.id,
                                        )?.quantity ?? 0
                                    }
                                    formattedPrice={formatRupiah(item.price)}
                                    onAdd={() => addToCart(item)}
                                    onRemove={() => updateQuantity(item.id, -1)}
                                    addLabel={t('addButton')}
                                />
                            ))}
                        </section>
                        {itemCount > 0 ? (
                            <BottomOrderBar
                                itemCount={itemCount}
                                total={formatRupiah(estimatedTotal)}
                                onReview={() => setStep('cart')}
                                itemCountLabel={t('itemCount')}
                                reviewLabel={t('reviewButton')}
                            />
                        ) : null}
                    </>
                ) : (
                    <CartReviewPanel
                        tableCode={catalog.table.code}
                        cart={cart}
                        itemCount={itemCount}
                        customerName={customerName}
                        guests={guestCount}
                        maxGuests={catalog.table.seats}
                        onGuestsChange={setGuestCount}
                        orderNote={orderNote}
                        subtotal={formatRupiah(subtotal)}
                        tax={formatRupiah(0)}
                        taxLabel={t('tax')}
                        service={formatRupiah(0)}
                        serviceLabel={t('service')}
                        showService={false}
                        total={formatRupiah(estimatedTotal)}
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
                        requireCustomerName
                        t={t}
                    />
                )}
            </div>
        </main>
    );
}

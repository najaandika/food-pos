import { RiSendPlane2Line } from '@remixicon/react';
import { Button } from '../../../../components/base/buttons/button';
import { Input } from '../../../../components/base/input/input';
import { NumberField } from '../../../../components/base/number-field/number-field';
import { Textarea } from '../../../../components/base/textarea/textarea';
import { CartItemRow } from './CartItemRow';
import { OrderSummary } from './OrderSummary';
import type { CustomerCartItem } from './types';
import type { CustomerTranslationKey } from '../customer-i18n';

type CartReviewPanelProps = {
    tableCode: string;
    cart: CustomerCartItem[];
    itemCount: number;
    customerName: string;
    guests: number;
    maxGuests: number;
    onGuestsChange: (guests: number) => void;
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
    guests,
    maxGuests,
    onGuestsChange,
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
    const checkoutDisabled =
        !cart.length ||
        (requireCustomerName && !customerName.trim()) ||
        !Number.isInteger(guests) ||
        guests < 1 ||
        guests > maxGuests ||
        submitting;

    return (
        <section className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <span className="text-caption-1-semibold text-text-tertiary">
                        {t('table')} {tableCode.toUpperCase()}
                    </span>
                    <h2 className="text-title-1-semibold text-text-primary">
                        {t('reviewTitle')}
                    </h2>
                    <p className="text-body-regular text-text-secondary">
                        {t('reviewSubtitle')}
                    </p>
                </div>
                <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    onClick={onChooseMenu}
                >
                    {t('chooseMenuButton')}
                </Button>
            </div>

            {cart.length === 0 ? (
                <div className="border-border-button-default bg-background-primary-default flex flex-col items-center gap-3 rounded-3xl border p-8 text-center">
                    <h3 className="text-title-2-semibold text-text-primary">
                        {t('emptyCartTitle')}
                    </h3>
                    <p className="text-body-regular text-text-secondary">
                        {t('emptyCartDesc')}
                    </p>
                    <Button onClick={onChooseMenu}>
                        {t('chooseMenuButton')}
                    </Button>
                </div>
            ) : (
                <>
                    <div className="bg-background-secondary-default rounded-2xl p-4">
                        <span className="text-caption-1-semibold text-text-tertiary">
                            {t('currentTicket')}
                        </span>
                        <strong className="text-headline-semibold text-text-primary block">
                            {itemCount} {t('itemsSelected')}
                        </strong>
                        <p className="text-body-regular text-text-secondary">
                            {t('ticketCheckHint')}
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        {cart.map((item) => (
                            <CartItemRow
                                key={item.id}
                                item={item}
                                formattedPrice={formatPrice(item.price)}
                                onNoteChange={(note) =>
                                    onItemNoteChange(item.id, note)
                                }
                                onQuantityChange={(quantity) => {
                                    const change = quantity - item.quantity;
                                    if (change < 0) {
                                        Array.from({ length: -change }).forEach(
                                            () => onItemDecrement(item.id),
                                        );
                                    }
                                    if (change > 0) {
                                        Array.from({ length: change }).forEach(
                                            () => onItemIncrement(item.id),
                                        );
                                    }
                                }}
                                notePlaceholder={t('itemNotePlaceholder')}
                            />
                        ))}
                    </div>

                    <div className="border-border-button-default bg-background-primary-default grid min-w-0 grid-cols-1 gap-4 rounded-3xl border p-5 sm:grid-cols-2 sm:p-6">
                        <NumberField
                            fieldClassName="customer-input-focus"
                            id="customer-guests"
                            name="guests"
                            label={`Jumlah tamu (maksimal ${maxGuests})`}
                            minValue={1}
                            maxValue={maxGuests}
                            step={1}
                            value={guests}
                            onChange={onGuestsChange}
                            isRequired
                        />
                        <Input
                            fieldClassName="customer-input-focus"
                            id="customer-name"
                            name="customerName"
                            label={`${t('yourName')}${requireCustomerName ? '' : t('nameOptional')}`}
                            value={customerName}
                            onChange={onCustomerNameChange}
                            placeholder={t('namePlaceholder')}
                            isRequired={requireCustomerName}
                        />
                        <Textarea
                            className="sm:col-span-2"
                            fieldClassName="customer-input-focus"
                            id="order-note"
                            name="orderNote"
                            label={t('orderNote')}
                            value={orderNote}
                            onChange={onOrderNoteChange}
                            placeholder={t('orderNotePlaceholder')}
                            rows={3}
                            maxLength={500}
                            showCount
                        />
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
                        <p
                            className="bg-notification-error-background text-body-medium text-notification-error-foreground rounded-xl p-3"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}
                    {checkoutDisabled && !submitting && !error && (
                        <p className="text-body-regular text-text-secondary">
                            {t('nameRequiredHint')}
                        </p>
                    )}

                    <Button
                        className="w-full"
                        leadingIcon={RiSendPlane2Line}
                        disabled={checkoutDisabled}
                        onClick={onCheckout}
                    >
                        {submitting
                            ? t('submittingButton')
                            : t('checkoutButton')}
                    </Button>
                </>
            )}
        </section>
    );
}

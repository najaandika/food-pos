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
        <div className="bg-background-secondary-default flex flex-col gap-3 rounded-2xl p-5">
            <p className="text-body-regular text-text-secondary flex items-center justify-between gap-4">
                <span>{subtotalLabel}</span>
                <strong>{subtotal}</strong>
            </p>
            <p className="text-body-regular text-text-secondary flex items-center justify-between gap-4">
                <span>{taxLabel}</span>
                <strong>{tax}</strong>
            </p>
            {showService && service && serviceLabel && (
                <p className="text-body-regular text-text-secondary flex items-center justify-between gap-4">
                    <span>{serviceLabel}</span>
                    <strong>{service}</strong>
                </p>
            )}
            <p className="border-separator-border text-headline-semibold text-text-primary flex items-center justify-between gap-4 border-t pt-4">
                <span>{totalLabel}</span>
                <strong>{total}</strong>
            </p>
        </div>
    );
}

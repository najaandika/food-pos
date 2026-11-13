import type { AdminOrder } from '../../runtime-data';

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 2,
});

export function formatDetailMoney(value: number): string {
    return rupiahFormatter.format(value);
}

type Props = { order: AdminOrder; isId: boolean; t: (key: string) => string };
export function OrderDetailTotals({ order, isId, t }: Props) {
    return (
        <section
            className="orders-detail-totals"
            aria-label={isId ? 'Ringkasan tagihan' : 'Bill summary'}
        >
            {order.rawSubtotal != null && (
                <div>
                    <span>{t('cashier.subtotal')}</span>
                    <strong>{formatDetailMoney(order.rawSubtotal)}</strong>
                </div>
            )}
            {order.rawTax != null && order.rawTax > 0 && (
                <div>
                    <span>{t('cashier.tax')}</span>
                    <strong>{formatDetailMoney(order.rawTax)}</strong>
                </div>
            )}
            {order.rawServiceCharge != null && order.rawServiceCharge > 0 && (
                <div>
                    <span>{t('cashier.serviceCharge')}</span>
                    <strong>{formatDetailMoney(order.rawServiceCharge)}</strong>
                </div>
            )}
            <div className="orders-detail-grand-total">
                <span>{isId ? 'Total pesanan' : 'Order total'}</span>
                <strong>{order.total}</strong>
            </div>
        </section>
    );
}

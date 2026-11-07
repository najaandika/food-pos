import { RiFileList3Line, RiInformationLine } from '@remixicon/react';
import type { UserRole } from '@/lib/pos-types';
import { Button } from '../../../../../../components/base/buttons/button';
import {
    DrawerHeader,
    DrawerBody,
    DrawerFooter,
} from '../../../../../../components/base/drawer/drawer';
import { StatusChip } from './StatusChip';
import type { AdminOrder } from '../../runtime-data';
import { useLocale } from '../../i18n-context';
import {
    ACTIVE_ORDER_STATUSES,
    nextOrderStatus,
    orderActionLabel,
    orderNumber,
    orderSourceLabel,
    orderStatusLabel,
} from './order-ui';

type Props = {
    selectedOrder: AdminOrder;
    role: UserRole;
    onMove: (order: AdminOrder) => void;
    onClose: () => void;
    canUpdate: boolean;
};

export function OrderDetail({
    selectedOrder: order,
    role,
    onMove,
    onClose,
    canUpdate,
}: Props) {
    const { locale, t } = useLocale();
    const id = locale === 'id';
    const status = order.rawStatus;
    const next = nextOrderStatus(role, status);
    const canAdvance =
        canUpdate && order.id != null && next !== null && status != null;
    const steps = [...ACTIVE_ORDER_STATUSES, 'paid' as const];
    const currentIndex =
        status && status !== 'cancelled' ? steps.indexOf(status) : -1;

    return (
        <>
            <DrawerHeader
                className="orders-detail-header"
                title={
                    <span
                        className="orders-detail-title text-title-1-semibold text-text-primary"
                        title={orderNumber(order)}
                    >
                        {orderNumber(order)}
                    </span>
                }
                description={
                    id
                        ? 'Informasi dan progres pesanan terpilih'
                        : 'Selected order information and progress'
                }
                closeLabel={t('common.close')}
            />
            <DrawerBody className="orders-detail-body">
                <div className="orders-detail-inner">
                    <div className="orders-detail-status-row">
                        <StatusChip
                            status={status}
                            fallbackLabel={order.status}
                        />
                        <span className="orders-detail-time text-caption-1-medium text-text-secondary">
                            {order.time}
                        </span>
                    </div>

                    {status === 'cancelled' ? (
                        <div className="orders-cancelled-banner" role="note">
                            <RiInformationLine aria-hidden="true" />
                            <p>
                                {id
                                    ? 'Pesanan ini dibatalkan. Tidak ada tindakan lanjutan.'
                                    : 'This order was cancelled. No further action is available.'}
                            </p>
                        </div>
                    ) : (
                        <section
                            className="orders-detail-flow"
                            aria-label={
                                id ? 'Progres pesanan' : 'Order progress'
                            }
                        >
                            <div className="orders-detail-flow-head">
                                <h3>
                                    {id ? 'Alur layanan' : 'Service workflow'}
                                </h3>
                                <div className="orders-detail-flow-meta">
                                    <span className="orders-detail-flow-current text-caption-1-medium">
                                        {status
                                            ? orderStatusLabel(status, t)
                                            : '—'}
                                    </span>
                                    <span>
                                        {currentIndex >= 0
                                            ? currentIndex +
                                              1 +
                                              '/' +
                                              steps.length
                                            : '—'}
                                    </span>
                                </div>
                            </div>
                            <ol>
                                {steps.map((step, index) => (
                                    <li
                                        key={step}
                                        title={orderStatusLabel(step, t)}
                                        aria-current={
                                            index === currentIndex
                                                ? 'step'
                                                : undefined
                                        }
                                        data-state={
                                            index < currentIndex
                                                ? 'done'
                                                : index === currentIndex
                                                  ? 'current'
                                                  : 'future'
                                        }
                                    >
                                        <span className="orders-flow-index text-caption-2-semibold">
                                            {index + 1}
                                        </span>
                                        <span>{orderStatusLabel(step, t)}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}

                    <section className="orders-detail-block">
                        <h3>{id ? 'Pelanggan & meja' : 'Customer & table'}</h3>
                        <div className="orders-detail-facts">
                            <div>
                                <span>{id ? 'Pelanggan' : 'Customer'}</span>
                                <strong>{order.name}</strong>
                            </div>
                            <div>
                                <span>{id ? 'Meja' : 'Table'}</span>
                                <strong>{order.table}</strong>
                            </div>
                            <div>
                                <span>{id ? 'Layanan' : 'Service'}</span>
                                <strong>
                                    {order.type === 'takeaway'
                                        ? t('orders.takeaway')
                                        : order.type === 'dine_in'
                                          ? t('orders.dineIn')
                                          : '—'}
                                </strong>
                            </div>
                            <div>
                                <span>{t('orders.source')}</span>
                                <strong>
                                    {orderSourceLabel(order.source, t)}
                                </strong>
                            </div>
                            {order.guests != null && (
                                <div>
                                    <span>{id ? 'Tamu' : 'Guests'}</span>
                                    <strong>{order.guests}</strong>
                                </div>
                            )}
                            <div>
                                <span>{id ? 'Waktu masuk' : 'Order time'}</span>
                                <strong>{order.time}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="orders-detail-block orders-detail-lines">
                        <div className="orders-detail-section-head">
                            <h3>{id ? 'Rincian item' : 'Order items'}</h3>
                            <span>
                                {order.items.length} {id ? 'baris' : 'lines'}
                            </span>
                        </div>
                        {order.items.length > 0 ? (
                            <div className="orders-detail-item-list">
                                {order.items.map(
                                    ([name, quantity, lineTotal], index) => (
                                        <div
                                            key={name + index}
                                            className="orders-detail-item-row"
                                        >
                                            <span className="orders-detail-item-qty text-caption-1-medium">
                                                ×{quantity}
                                            </span>
                                            <strong>{name}</strong>
                                            <span className="orders-detail-item-price text-body-2-semibold">
                                                {lineTotal || '—'}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        ) : (
                            <p className="orders-detail-no-items">
                                {id
                                    ? 'Detail item belum tersedia.'
                                    : 'Item details are unavailable.'}
                            </p>
                        )}
                        {order.notes && (
                            <div className="orders-detail-notes">
                                <RiFileList3Line aria-hidden="true" />
                                <div>
                                    <strong>
                                        {id
                                            ? 'Catatan pelanggan'
                                            : 'Customer notes'}
                                    </strong>
                                    <p>{order.notes}</p>
                                </div>
                            </div>
                        )}
                    </section>

                    <section
                        className="orders-detail-totals"
                        aria-label={id ? 'Ringkasan tagihan' : 'Bill summary'}
                    >
                        {order.rawSubtotal != null && (
                            <div>
                                <span>{t('cashier.subtotal')}</span>
                                <strong>
                                    {new Intl.NumberFormat('id-ID', {
                                        style: 'currency',
                                        currency: 'IDR',
                                        maximumFractionDigits: 2,
                                    }).format(order.rawSubtotal)}
                                </strong>
                            </div>
                        )}
                        {order.rawTax != null && order.rawTax > 0 && (
                            <div>
                                <span>{t('cashier.tax')}</span>
                                <strong>
                                    {new Intl.NumberFormat('id-ID', {
                                        style: 'currency',
                                        currency: 'IDR',
                                        maximumFractionDigits: 2,
                                    }).format(order.rawTax)}
                                </strong>
                            </div>
                        )}
                        {order.rawServiceCharge != null &&
                            order.rawServiceCharge > 0 && (
                                <div>
                                    <span>{t('cashier.serviceCharge')}</span>
                                    <strong>
                                        {new Intl.NumberFormat('id-ID', {
                                            style: 'currency',
                                            currency: 'IDR',
                                            maximumFractionDigits: 2,
                                        }).format(order.rawServiceCharge)}
                                    </strong>
                                </div>
                            )}
                        <div className="orders-detail-grand-total">
                            <span>{id ? 'Total pesanan' : 'Order total'}</span>
                            <strong>{order.total}</strong>
                        </div>
                    </section>
                </div>
            </DrawerBody>
            <DrawerFooter className="orders-detail-footer">
                <div className="orders-detail-footer-note text-caption-1-regular text-text-secondary">
                    <RiInformationLine aria-hidden="true" />
                    <span>
                        {id
                            ? 'Perubahan status divalidasi dan disimpan ke Laravel setelah berhasil.'
                            : 'Status changes are validated and saved to Laravel when confirmed.'}
                    </span>
                </div>
                <div className="orders-detail-actions">
                    <Button variant="secondary" size="medium" onClick={onClose}>
                        {t('common.close')}
                    </Button>
                    {canAdvance && status && (
                        <Button
                            variant="primary"
                            size="medium"
                            onClick={() => onMove(order)}
                        >
                            {orderActionLabel(status, t)}
                        </Button>
                    )}
                </div>
            </DrawerFooter>
        </>
    );
}

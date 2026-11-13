import { RiInformationLine } from '@remixicon/react';
import type { AdminOrder } from '../../runtime-data';
import { ACTIVE_ORDER_STATUSES, orderStatusLabel } from './order-ui';

type Props = {
    status: AdminOrder['rawStatus'];
    isId: boolean;
    t: (key: string) => string;
};
export function OrderDetailWorkflow({ status, isId, t }: Props) {
    const steps = [...ACTIVE_ORDER_STATUSES, 'paid' as const];
    const currentIndex =
        status && status !== 'cancelled' ? steps.indexOf(status) : -1;
    return (
        <>
            {status === 'cancelled' ? (
                <div className="orders-cancelled-banner" role="note">
                    <RiInformationLine aria-hidden="true" />
                    <p>
                        {isId
                            ? 'Pesanan ini dibatalkan. Tidak ada tindakan lanjutan.'
                            : 'This order was cancelled. No further action is available.'}
                    </p>
                </div>
            ) : (
                <section
                    className="orders-detail-flow"
                    aria-label={isId ? 'Progres pesanan' : 'Order progress'}
                >
                    <div className="orders-detail-flow-head">
                        <h3>{isId ? 'Alur layanan' : 'Service workflow'}</h3>
                        <div className="orders-detail-flow-meta">
                            <span className="orders-detail-flow-current text-caption-1-medium">
                                {status ? orderStatusLabel(status, t) : '—'}
                            </span>
                            <span>
                                {currentIndex >= 0
                                    ? currentIndex + 1 + '/' + steps.length
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
                                    index === currentIndex ? 'step' : undefined
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
        </>
    );
}

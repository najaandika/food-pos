import type { AdminOrder } from '../../runtime-data';
import { useLocale } from '../../i18n-context';

type Props = {
    incomingQrOrders: AdminOrder[];
};

function OrderTableBadge({ table, tone }: { table: string; tone: string }) {
    const separator = table.lastIndexOf('-');
    const hasParts = separator > 0 && separator < table.length - 1;

    return (
        <div
            className={`table-pill qr-order-table-badge ${tone}`}
            title={table}
        >
            {hasParts ? (
                <>
                    <span className="qr-order-table-prefix">
                        {table.slice(0, separator)}
                    </span>
                    <span className="qr-order-table-suffix">
                        {table.slice(separator + 1)}
                    </span>
                </>
            ) : (
                <span className="qr-order-table-suffix">{table}</span>
            )}
        </div>
    );
}

export function IncomingQrOrdersPanel({ incomingQrOrders }: Props) {
    const { t } = useLocale();
    return (
        <section className="qr-order-panel">
            <div className="qr-order-panel-head">
                <div>
                    <span>{t('menu.incomingOrders')}</span>
                    <h2>{t('menu.qrOrders')}</h2>
                    <p>{t('menu.qrOrdersDesc')}</p>
                </div>
            </div>
            <div className="qr-order-list">
                {incomingQrOrders.map((order) => (
                    <article
                        className="qr-order-card"
                        key={order.id ?? order.orderNumber}
                    >
                        <OrderTableBadge
                            table={order.table}
                            tone={order.tone}
                        />
                        <div className="qr-order-info">
                            <strong>{order.name}</strong>
                            <span>
                                {order.tableCode
                                    ? `${t('common.table')} ${order.tableCode}`
                                    : t('menu.takeaway')}{' '}
                                · {order.items.length} {t('common.items')} ·{' '}
                                {order.time}
                            </span>
                            <small>
                                {order.items
                                    .slice(0, 2)
                                    .map((item) => `${item[0]} x${item[1]}`)
                                    .join(' · ')}
                            </small>
                        </div>
                        <div className="qr-order-meta">
                            <b>{order.total}</b>
                            <span className={`mini-status ${order.statusTone}`}>
                                {order.status}
                            </span>
                        </div>
                    </article>
                ))}
                {incomingQrOrders.length === 0 && (
                    <p className="empty-state">{t('menu.noQrOrders')}</p>
                )}
            </div>
        </section>
    );
}

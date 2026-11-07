import {
    RiAddLine,
    RiBankCardLine,
    RiFileList3Line,
    RiQrCodeLine,
    RiRestaurantLine,
} from '@remixicon/react';
import { Button } from '../../../../../../components/base/buttons/button';
import type { UserRole } from '../../../../lib/pos-types';
import { useLocale } from '../../i18n-context';
import type { AdminOrder } from '../../runtime-data';
import type { View } from '../../types';
import { resolveOrderStatus, statusTranslations } from './order-status';

type DashboardFooterProps = {
    role: UserRole;
    hasSnapshot: boolean;
    activeTableCount: number;
    tableOrders: AdminOrder[];
    onChangeView: (view: View) => void;
};

export function DashboardFooter({
    role,
    hasSnapshot,
    activeTableCount,
    tableOrders,
    onChangeView,
}: DashboardFooterProps) {
    const { locale, t } = useLocale();
    const isId = locale === 'id';
    const localized = (id: string, en: string) => (isId ? id : en);
    const quickActions: Array<{
        label: string;
        description: string;
        view: View;
        icon: typeof RiAddLine;
    }> =
        role === 'owner'
            ? [
                  {
                      label: t('dashboard.createOrder'),
                      description: localized('Pesanan manual', 'Manual order'),
                      view: 'menu',
                      icon: RiAddLine,
                  },
                  {
                      label: t('dashboard.openCashier'),
                      description: localized(
                          'Proses pembayaran',
                          'Process payments',
                      ),
                      view: 'cashier',
                      icon: RiBankCardLine,
                  },
                  {
                      label: t('dashboard.manageMenu'),
                      description: localized(
                          'Produk dan harga',
                          'Products and pricing',
                      ),
                      view: 'owner-menu',
                      icon: RiRestaurantLine,
                  },
                  {
                      label: t('dashboard.generateQr'),
                      description: localized(
                          'Meja dan QR',
                          'Tables and QR codes',
                      ),
                      view: 'owner-tables',
                      icon: RiQrCodeLine,
                  },
              ]
            : role === 'kasir'
              ? [
                    {
                        label: t('dashboard.createOrder'),
                        description: localized(
                            'Pesanan manual',
                            'Manual order',
                        ),
                        view: 'menu',
                        icon: RiAddLine,
                    },
                    {
                        label: t('dashboard.paymentQueue'),
                        description: localized(
                            'Proses pembayaran',
                            'Process payments',
                        ),
                        view: 'cashier',
                        icon: RiBankCardLine,
                    },
                    {
                        label: t('dashboard.orderBoard'),
                        description: localized(
                            'Lihat antrean',
                            'View order queue',
                        ),
                        view: 'orders',
                        icon: RiFileList3Line,
                    },
                ]
              : [
                    {
                        label: t('dashboard.orderBoard'),
                        description: localized(
                            'Lihat antrean',
                            'View order queue',
                        ),
                        view: 'orders',
                        icon: RiFileList3Line,
                    },
                    {
                        label: t('dashboard.waitersStation'),
                        description: localized('Layanan meja', 'Table service'),
                        view: 'waiters',
                        icon: RiRestaurantLine,
                    },
                ];

    return (
        <div className="od-footer-grid">
            <section
                className="od-surface od-shortcuts"
                aria-labelledby="od-shortcuts-title"
            >
                <div className="od-card-topline">
                    <div>
                        <span className="od-section-label">
                            {localized('Pintasan', 'Shortcuts')}
                        </span>
                        <h2 id="od-shortcuts-title">
                            {t('dashboard.quickActions')}
                        </h2>
                    </div>
                </div>
                <div className="od-shortcut-grid">
                    {quickActions.map(
                        ({ icon: Icon, label, description, view }) => (
                            <button
                                type="button"
                                className="od-shortcut"
                                key={view}
                                onClick={() => onChangeView(view)}
                            >
                                <span className="od-shortcut-icon">
                                    <Icon aria-hidden="true" />
                                </span>
                                <span className="od-shortcut-copy">
                                    <strong>{label}</strong>
                                    <small>{description}</small>
                                </span>
                            </button>
                        ),
                    )}
                </div>
            </section>
            <section
                className="od-surface od-tables-card"
                aria-labelledby="od-tables-title"
            >
                <div className="od-card-topline">
                    <div>
                        <span className="od-section-label">
                            {localized('Layanan meja', 'Table service')}
                        </span>
                        <h2 id="od-tables-title">
                            {localized(
                                'Meja dengan pesanan aktif',
                                'Tables with active orders',
                            )}
                        </h2>
                    </div>
                    <span className="od-table-count">
                        {hasSnapshot ? activeTableCount : '—'}
                    </span>
                </div>
                {tableOrders.length ? (
                    <div className="od-table-pulse">
                        {tableOrders.map((order) => {
                            const status = resolveOrderStatus(order);
                            return (
                                <div
                                    className="od-table-pulse-item"
                                    key={order.tableCode}
                                >
                                    <RiRestaurantLine aria-hidden="true" />
                                    <strong>{order.tableCode}</strong>
                                    <span>
                                        {status
                                            ? statusTranslations[status][locale]
                                            : order.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="od-empty-copy">
                        {localized(
                            'Belum ada meja dengan pesanan aktif.',
                            'No tables with active orders.',
                        )}
                    </p>
                )}
                {role === 'owner' && (
                    <Button
                        variant="secondary"
                        size="small"
                        className="od-card-footer-action"
                        onClick={() => onChangeView('owner-tables')}
                    >
                        {t('dashboard.generateQr')}
                    </Button>
                )}
            </section>
        </div>
    );
}

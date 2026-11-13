import { RiCheckboxCircleLine as CheckCircle2 } from '@remixicon/react';
import { Chip } from '../../../../../../components/base/badges/chip';
import { Button } from '../../../../../../components/base/buttons/button';
import { Input } from '../../../../../../components/base/input/input';
import { NumberField } from '../../../../../../components/base/number-field/number-field';
import {
    Select,
    SelectItem,
} from '../../../../../../components/base/select/select';

import { formatRupiah } from '../../../lib/format';
import { useLocale } from '../../i18n-context';

import type { AdminTable } from '../../runtime-data';
import { CartPanelFooter, CartPanelItems } from './CartPanelSections';
import {
    getMaxCartGuests,
    type CartLine,
    type SentMenuOrder,
} from './menu-model';

type Props = {
    cartLines: CartLine[];
    itemCount: number;
    subtotal: number;
    tax: number;
    serviceCharge: number;
    total: number;
    taxRate: number;
    serviceRate: number;
    customerName: string;
    guests: number;
    orderType: 'dine_in' | 'takeaway';
    tableCode: string;
    availableTables: AdminTable[];
    onChangeCustomerName: (value: string) => void;
    onChangeTableCode: (value: string) => void;
    onChangeGuests: (value: number) => void;
    onVoidTicket: () => void;
    submitting: boolean;
    sendError: string;
    sentOrder: SentMenuOrder;
    onSendOrder: () => void;
    onChangeLineNote: (dishId: number | undefined, note: string) => void;
    onStartNewTicket: () => void;
    onGoToOrders?: () => void;
    onGoToCashier?: () => void;
};

export function CartPanel({
    cartLines,
    itemCount,
    subtotal,
    tax,
    serviceCharge,
    total,
    taxRate,
    serviceRate,
    customerName,
    guests,
    orderType,
    tableCode,
    availableTables,
    onChangeCustomerName,
    onChangeTableCode,
    onChangeGuests,
    onVoidTicket,
    submitting,
    sendError,
    sentOrder,
    onSendOrder,
    onChangeLineNote,
    onStartNewTicket,
    onGoToOrders,
    onGoToCashier,
}: Props) {
    const { t } = useLocale();
    const selectedTable = availableTables.find(
        (table) => table.code === tableCode,
    );
    const maxGuests = getMaxCartGuests(orderType, selectedTable);

    return (
        <aside className="receipt-panel">
            <div className="receipt-top">
                <div className="receipt-customer">
                    <div>
                        <span>{t('cart.currentTicket')}</span>
                        <h3>{customerName}</h3>
                        <small>
                            {orderType === 'takeaway'
                                ? t('menu.takeaway')
                                : `${t('menu.dineIn')} / ${guests} ${t('common.guests')}`}
                        </small>
                    </div>
                </div>
                <div className="receipt-meta-chips menu-p2-ticket-chips">
                    <Chip color="blue" variant="caption">
                        {orderType === 'dine_in'
                            ? `${t('common.table')} ${tableCode}`
                            : t('menu.takeaway')}
                    </Chip>
                    <Chip color="cyan" variant="caption">
                        {t('cart.draft')}
                    </Chip>
                </div>
            </div>
            <div className="menu-order-details">
                <div className="menu-order-details-heading">
                    <strong>Detail pesanan</strong>
                    <Button
                        variant="ghost"
                        size="xs"
                        className="menu-p2-void-button"
                        disabled={itemCount === 0 || submitting}
                        onClick={onVoidTicket}
                    >
                        {t('menu.voidTicket')}
                    </Button>
                </div>
                <div className="menu-order-field menu-p2-order-field">
                    <Input
                        label="Nama pelanggan"
                        size="small"
                        type="text"
                        value={customerName}
                        onChange={onChangeCustomerName}
                        autoComplete="off"
                        maxLength={120}
                        placeholder="Masukkan nama pelanggan"
                        isDisabled={submitting}
                    />
                </div>
                {orderType === 'dine_in' && (
                    <div className="menu-order-field menu-p2-order-field">
                        <Select
                            label="Meja"
                            size="sm"
                            className="menu-p2-table-select"
                            triggerClassName="menu-p2-table-trigger"
                            placeholder="Pilih meja tersedia"
                            selectedKey={selectedTable ? tableCode : null}
                            onSelectionChange={(key) => {
                                if (key != null) onChangeTableCode(String(key));
                            }}
                            isDisabled={
                                submitting || availableTables.length === 0
                            }
                        >
                            {availableTables.map((table) => (
                                <SelectItem
                                    id={table.code}
                                    key={table.id ?? table.code}
                                    textValue={`${table.name} · ${table.seats} kursi`}
                                >
                                    {table.name} · {table.seats} kursi
                                </SelectItem>
                            ))}
                        </Select>
                        {availableTables.length === 0 && (
                            <small role="status">
                                Belum ada meja tersedia. Pilih Takeaway atau
                                tunggu meja kosong.
                            </small>
                        )}
                    </div>
                )}
                <div className="menu-order-field menu-p2-order-field">
                    <NumberField
                        label="Jumlah tamu"
                        size="small"
                        className="menu-p2-guests-field"
                        value={guests}
                        onChange={(value) => {
                            if (Number.isFinite(value)) {
                                onChangeGuests(
                                    Math.max(
                                        1,
                                        Math.min(maxGuests, Math.round(value)),
                                    ),
                                );
                            }
                        }}
                        minValue={1}
                        maxValue={maxGuests}
                        isDisabled={submitting}
                    />
                    {orderType === 'dine_in' && selectedTable && (
                        <small>Maks. {selectedTable.seats} orang</small>
                    )}
                </div>
            </div>
            <p className="receipt-date">
                {sentOrder
                    ? t('cart.orderSentToKitchen').replace(
                          '{number}',
                          sentOrder.orderNumber,
                      )
                    : t('cart.readyToSend')}
            </p>
            <div className="ticket-readiness">
                <span>
                    <b></b>{' '}
                    {sentOrder
                        ? t('cart.kitchenReceived')
                        : t('cart.kitchenQueueLive')}
                </span>
                <span>
                    <b></b> {t('cart.payAfterServe')}
                </span>
            </div>
            {sentOrder && (
                <div className="order-sent-card">
                    <CheckCircle2 aria-hidden="true" />
                    <div>
                        <span>{t('cart.orderSent')}</span>
                        <strong>{sentOrder.customerName}</strong>
                        <p>
                            {sentOrder.table} / {sentOrder.itemCount}{' '}
                            {t('common.items')} /{' '}
                            {formatRupiah(sentOrder.total)}
                        </p>
                    </div>
                </div>
            )}
            {sendError && <p className="pos-send-error">{sendError}</p>}
            {sentOrder && (
                <div className="post-send-actions menu-p2-post-send">
                    <Button
                        variant="primary"
                        size="small"
                        onClick={onGoToOrders}
                    >
                        {t('cart.viewOrders')}
                    </Button>
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={onGoToCashier}
                    >
                        {t('dashboard.openCashier')}
                    </Button>
                </div>
            )}
            <CartPanelItems
                cartLines={cartLines}
                sentOrder={sentOrder}
                onChangeLineNote={onChangeLineNote}
            />
            <CartPanelFooter
                itemCount={itemCount}
                subtotal={subtotal}
                tax={tax}
                serviceCharge={serviceCharge}
                total={total}
                taxRate={taxRate}
                serviceRate={serviceRate}
                submitting={submitting}
                sentOrder={sentOrder}
                onSendOrder={onSendOrder}
                onStartNewTicket={onStartNewTicket}
            />
        </aside>
    );
}

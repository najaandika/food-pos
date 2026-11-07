import {
    RiCheckboxCircleLine as CheckCircle2,
    RiRestaurant2Line as ChefHat,
    RiLoader4Line as Loader2,
} from '@remixicon/react';
import { useState } from 'react';
import { Chip } from '../../../../../../components/base/badges/chip';
import { Button } from '../../../../../../components/base/buttons/button';
import { Input } from '../../../../../../components/base/input/input';
import { NumberField } from '../../../../../../components/base/number-field/number-field';
import { Select, SelectItem } from '../../../../../../components/base/select/select';
import { Textarea } from '../../../../../../components/base/textarea/textarea';

import { formatRupiah } from '../../../lib/format';
import { useLocale } from '../../i18n-context';

import type { AdminDish, AdminTable } from '../../runtime-data';

type CartLine = AdminDish & { cartQty: number; note?: string };

type SentOrder = {
    id: number;
    orderNumber: string;
    customerName: string;
    table: string;
    itemCount: number;
    total: number;
} | null;

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
    sentOrder: SentOrder;
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
    const [editingNote, setEditingNote] = useState<number | undefined>();
    const selectedTable = availableTables.find((table) => table.code === tableCode);
    const maxGuests =
        orderType === 'dine_in'
            ? Math.min(99, Math.max(1, selectedTable?.seats ?? 99))
            : 99;

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
                    <Chip color="neutral" variant="caption">{t('cart.draft')}</Chip>
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
                            isDisabled={submitting || availableTables.length === 0}
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
                            <small role="status">Belum ada meja tersedia. Pilih Takeaway atau tunggu meja kosong.</small>
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
                                onChangeGuests(Math.max(1, Math.min(maxGuests, Math.round(value))));
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
                    <Button variant="primary" size="small" onClick={onGoToOrders}>
                        {t('cart.viewOrders')}
                    </Button>
                    <Button variant="secondary" size="small" onClick={onGoToCashier}>
                        {t('dashboard.openCashier')}
                    </Button>
                </div>
            )}
            <div className="receipt-order-scroll">
                <h3>{t('cart.orderDetail')}</h3>
                <div className="receipt-items">
                    {cartLines.map((line) => (
                        <div className="receipt-item" key={line.id}>
                            <div>
                                <strong>{line.name}</strong>
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    className="menu-p2-note-toggle"
                                    onClick={() =>
                                        setEditingNote(
                                            editingNote === line.id
                                                ? undefined
                                                : line.id,
                                        )
                                    }
                                >
                                    {line.note
                                        ? t('cart.editNote')
                                        : t('cart.notes')}
                                </Button>
                                {editingNote === line.id && (
                                    <Textarea
                                        className="menu-p2-line-note"
                                        aria-label={`Catatan untuk ${line.name}`}
                                        size="small"
                                        resize="none"
                                        value={line.note ?? ''}
                                        onChange={(value) => onChangeLineNote(line.id, value)}
                                        placeholder={t('cart.addItemNote')}
                                        rows={2}
                                    />
                                )}
                            </div>
                            <div className="menu-p2-item-meta">
                                <span>x{line.cartQty}</span>
                                <strong>
                                    {formatRupiah(
                                        (line.rawPrice ?? 0) * line.cartQty,
                                    )}
                                </strong>
                            </div>
                        </div>
                    ))}
                    {!cartLines.length && (
                        <p className="receipt-date">
                            {sentOrder
                                ? t('cart.startNewTicketDesc')
                                : t('cart.noItemsSelected')}
                        </p>
                    )}
                </div>
            </div>
            <div className="receipt-footer">
                <div className="receipt-total">
                    <span>
                        {t('common.items')} ({itemCount})
                    </span>
                    <strong>{formatRupiah(subtotal)}</strong>
                </div>
                <div className="receipt-total">
                    <span>
                        {t('cart.tax')} ({taxRate}%)
                    </span>
                    <strong>{formatRupiah(tax)}</strong>
                </div>
                {serviceRate > 0 && (
                    <div className="receipt-total">
                        <span>
                            {t('cart.service')} ({serviceRate}%)
                        </span>
                        <strong>{formatRupiah(serviceCharge)}</strong>
                    </div>
                )}
                <Button
                    variant="primary"
                    size="medium"
                    className="menu-p2-send-button"
                    disabled={!itemCount || submitting}
                    onClick={() => onSendOrder()}
                    aria-label={
                        itemCount > 0
                            ? `${t('cart.sendOrder')}, total ${formatRupiah(total)}`
                            : t('cart.noItemsSelected')
                    }
                >
                    <span className="menu-p2-send-copy">
                        <span className="menu-p2-send-info">
                            {itemCount > 0
                                ? `${itemCount} ${t('common.items')}`
                                : t('cart.noItemsSelected')}
                        </span>
                        <strong>{formatRupiah(total)}</strong>
                    </span>
                    <span className="menu-p2-send-action">
                        {submitting ? (
                            <Loader2 className="pos-spin-icon" size={18} aria-hidden="true" />
                        ) : (
                            <ChefHat size={18} aria-hidden="true" />
                        )}
                        <span>{submitting ? t('cart.sendingOrder') : t('cart.sendOrder')}</span>
                    </span>
                </Button>
                {sentOrder && (
                    <Button
                        variant="secondary"
                        size="small"
                        className="menu-p2-new-ticket"
                        onClick={onStartNewTicket}
                    >
                        {t('cart.newTicket')}
                    </Button>
                )}
            </div>
        </aside>
    );
}

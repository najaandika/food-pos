import {
    RiRestaurant2Line as ChefHat,
    RiLoader4Line as Loader2,
} from '@remixicon/react';
import { useState } from 'react';
import { Button } from '../../../../../../components/base/buttons/button';
import { Textarea } from '../../../../../../components/base/textarea/textarea';

import { formatRupiah } from '../../../lib/format';
import { useLocale } from '../../i18n-context';
import type { CartLine, SentMenuOrder } from './menu-model';

type CartPanelItemsProps = {
    cartLines: CartLine[];
    sentOrder: SentMenuOrder;
    onChangeLineNote: (dishId: number | undefined, note: string) => void;
};

export function CartPanelItems({
    cartLines,
    sentOrder,
    onChangeLineNote,
}: CartPanelItemsProps) {
    const { t } = useLocale();
    const [editingNote, setEditingNote] = useState<number | undefined>();
    return (
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
                                    onChange={(value) =>
                                        onChangeLineNote(line.id, value)
                                    }
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
    );
}

type CartPanelFooterProps = {
    itemCount: number;
    subtotal: number;
    tax: number;
    serviceCharge: number;
    total: number;
    taxRate: number;
    serviceRate: number;
    submitting: boolean;
    sentOrder: SentMenuOrder;
    onSendOrder: () => void;
    onStartNewTicket: () => void;
};

export function CartPanelFooter({
    itemCount,
    subtotal,
    tax,
    serviceCharge,
    total,
    taxRate,
    serviceRate,
    submitting,
    sentOrder,
    onSendOrder,
    onStartNewTicket,
}: CartPanelFooterProps) {
    const { t } = useLocale();
    return (
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
                        <Loader2
                            className="pos-spin-icon"
                            size={18}
                            aria-hidden="true"
                        />
                    ) : (
                        <ChefHat size={18} aria-hidden="true" />
                    )}
                    <span>
                        {submitting
                            ? t('cart.sendingOrder')
                            : t('cart.sendOrder')}
                    </span>
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
    );
}

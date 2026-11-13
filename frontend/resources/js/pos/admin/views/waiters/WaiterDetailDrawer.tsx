import { Chip } from '../../../../../../components/base/badges/chip';
import { StatusChip } from '../orders/StatusChip';
import { Button } from '../../../../../../components/base/buttons/button';
import {
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
} from '../../../../../../components/base/drawer/drawer';
import type { PosOrderStatus } from '../../../../lib/pos-types';
import type { AdminOrder, AdminTable } from '../../runtime-data';
import { displayOrderReference } from '../../presentation-labels';
import {
    nextWaiterAction,
    tableStatusStyles,
    waiterActionLabels,
} from './waiter-model';

type Props = {
    focusTable?: AdminTable;
    focusOrder?: AdminOrder;
    focusAction?: (typeof nextWaiterAction)[PosOrderStatus];
    tableStatuses: ReturnType<typeof tableStatusStyles>;
    actionCopy: ReturnType<typeof waiterActionLabels>;
    isId: boolean;
    isSaving: boolean;
    onUpdateStatus?: (
        orderId: number | undefined,
        status: PosOrderStatus,
    ) => void | Promise<void>;
    onAcknowledgeCall?: (tableId: number | undefined) => void | Promise<void>;
    advance: (order: AdminOrder) => Promise<void>;
    acknowledgeCall: (table: AdminTable) => Promise<void>;
    onClose: () => void;
    t: (key: string) => string;
};

export function WaiterDetailDrawer({
    focusTable,
    focusOrder,
    focusAction,
    tableStatuses,
    actionCopy,
    isId,
    isSaving,
    onUpdateStatus,
    onAcknowledgeCall,
    advance,
    acknowledgeCall,
    onClose,
    t,
}: Props) {
    return (
        <Drawer
            isOpen
            placement="end"
            size="md"
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            aria-label={isId ? 'Detail layanan' : 'Service details'}
        >
            <DrawerHeader
                title={focusTable?.name ?? focusOrder?.name ?? ''}
                description={
                    focusTable
                        ? isId
                            ? 'Informasi dan status meja'
                            : 'Table information and status'
                        : isId
                          ? 'Informasi pesanan dan tindakan'
                          : 'Order information and action'
                }
                closeLabel={t('common.close')}
            />
            <DrawerBody className="waiters-detail-body">
                {focusTable && (
                    <div className="waiters-detail-fields text-caption-1-regular">
                        <div>
                            <span>{t('common.table')}</span>
                            <strong className="text-body-2-semibold">
                                {focusTable.code}
                            </strong>
                        </div>
                        <div>
                            <span>Area</span>
                            <strong className="text-body-2-semibold">
                                {focusTable.area}
                            </strong>
                        </div>
                        <div>
                            <span>{t('waiters.seats')}</span>
                            <strong className="text-body-2-semibold">
                                {focusTable.seats}
                            </strong>
                        </div>
                        <div>
                            <span>{isId ? 'Status meja' : 'Table status'}</span>
                            <Chip
                                color={
                                    tableStatuses[
                                        focusTable.rawStatus ?? 'available'
                                    ].color
                                }
                                variant="caption"
                            >
                                {
                                    tableStatuses[
                                        focusTable.rawStatus ?? 'available'
                                    ].label
                                }
                            </Chip>
                        </div>
                    </div>
                )}
                {focusOrder ? (
                    <>
                        <div className="waiters-detail-fields text-caption-1-regular">
                            <div>
                                <span>{isId ? 'Pesanan' : 'Order'}</span>
                                <strong className="text-body-2-semibold">
                                    {(focusOrder.orderNumber
                                        ? displayOrderReference(
                                              focusOrder.orderNumber,
                                          )
                                        : null) ?? '#' + (focusOrder.id ?? '—')}
                                </strong>
                            </div>
                            <div>
                                <span>{t('common.table')}</span>
                                <strong className="text-body-2-semibold">
                                    {focusOrder.table}
                                </strong>
                            </div>
                            <div>
                                <span>Status</span>
                                <StatusChip
                                    variant="caption"
                                    status={focusOrder.rawStatus}
                                    fallbackLabel={focusOrder.status}
                                />
                            </div>
                            <div>
                                <span>{isId ? 'Waktu' : 'Time'}</span>
                                <strong className="text-body-2-semibold">
                                    {focusOrder.time}
                                </strong>
                            </div>
                        </div>
                        <div className="waiters-detail-items text-body-2-regular">
                            <h3 className="text-body-semibold">
                                {isId ? 'Item pesanan' : 'Order items'}
                            </h3>
                            {focusOrder.items?.length ? (
                                focusOrder.items.map(([name, qty], index) => (
                                    <div key={name + '-' + index}>
                                        <span>{name}</span>
                                        <strong className="text-body-2-semibold">
                                            ×{qty}
                                        </strong>
                                    </div>
                                ))
                            ) : (
                                <p>
                                    {isId
                                        ? 'Belum ada detail item.'
                                        : 'No item details available.'}
                                </p>
                            )}
                        </div>
                        {focusOrder.notes && (
                            <p className="waiters-order-notes text-caption-1-regular">
                                {focusOrder.notes}
                            </p>
                        )}
                    </>
                ) : (
                    <p className="waiters-dialog-note text-caption-1-regular">
                        {isId
                            ? 'Belum ada pesanan aktif yang terhubung ke meja ini.'
                            : 'No active order is linked to this table.'}
                    </p>
                )}
            </DrawerBody>
            <DrawerFooter>
                {focusTable?.rawStatus === 'need_waiter' &&
                    onAcknowledgeCall &&
                    focusTable.id != null && (
                        <Button
                            disabled={isSaving}
                            onClick={() => void acknowledgeCall(focusTable)}
                        >
                            {isSaving
                                ? isId
                                    ? 'Menyimpan…'
                                    : 'Saving…'
                                : isId
                                  ? 'Tandai panggilan ditangani'
                                  : 'Mark call handled'}
                        </Button>
                    )}
                {focusAction && onUpdateStatus && focusOrder?.id != null && (
                    <Button
                        disabled={isSaving}
                        onClick={() => void advance(focusOrder)}
                    >
                        {actionCopy[focusAction.label]}
                    </Button>
                )}
                <Button variant="secondary" onClick={() => onClose()}>
                    {t('common.close')}
                </Button>
            </DrawerFooter>
        </Drawer>
    );
}

import type { PosOrderStatus, UserRole } from '@/lib/pos-types';
import { Button } from '../../../../../../components/base/buttons/button';
import { OrdersView } from './OrdersView';
import { advanceSavedOrder } from './server-orders';
import { useSavedOrders } from './use-saved-orders';

export function OrdersServer({
    role,
    initialSelectedOrderKey,
}: {
    role: UserRole;
    initialSelectedOrderKey?: string | null;
}) {
    const {
        orders,
        isLoading,
        isSaving,
        error,
        actionError,
        clearActionError,
        reload,
        run,
    } = useSavedOrders();

    const updateStatus = (id: number | undefined, status: PosOrderStatus) => {
        if (id === undefined) return Promise.resolve();
        return run(() => advanceSavedOrder(id, status));
    };

    return (
        <>
            {(actionError || (error && orders.length > 0)) && (
                <div
                    className="orders-p8-alert border-border-button-default bg-background-secondary-default text-body-2-regular text-text-primary mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    role="alert"
                >
                    <span>{actionError || error}</span>
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={() => {
                            clearActionError();
                            void reload(true);
                        }}
                    >
                        Muat ulang
                    </Button>
                </div>
            )}
            <OrdersView
                role={role}
                orders={orders}
                initialSelectedOrderKey={initialSelectedOrderKey}
                onUpdateStatus={updateStatus}
                isSaving={isSaving}
                isLoading={isLoading && orders.length === 0}
                error={orders.length === 0 ? error : undefined}
                onRetry={() => void reload(true)}
            />
        </>
    );
}

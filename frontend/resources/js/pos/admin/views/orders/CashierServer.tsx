import { useRef, useState } from 'react';
import { Button } from '../../../../../../components/base/buttons/button';
import type { PosSettings } from '@/lib/pos-types';
import type { AuthUser } from '../../auth';
import { CashierView } from '../cashier/CashierView';
import { ConfirmedReceiptModal } from '../cashier/ConfirmedReceiptModal';
import type { ConfirmedCashierReceipt } from '../cashier/cashier-api';
import { useCashierData } from '../cashier/use-cashier-data';

export function CashierServer({
    settings,
    user,
}: {
    settings?: PosSettings;
    user: AuthUser;
}) {
    const {
        orders,
        stats,
        isLoading,
        isSaving,
        error,
        reload,
        pay,
        retryReceipt,
        confirmedOrderIds,
        page,
        lastPage,
        total,
        changeSearch,
        changeFilter,
        setPage,
    } = useCashierData();
    const [confirmedReceipt, setConfirmedReceipt] =
        useState<ConfirmedCashierReceipt | null>(null);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [pendingReceipts, setPendingReceipts] = useState<
        Array<{ orderId: number; error: string }>
    >([]);
    const [receiptRetryingId, setReceiptRetryingId] = useState<number | null>(
        null,
    );
    const receiptRetryBusyRef = useRef(false);
    const attemptRef = useRef<{ fingerprint: string; key: string } | null>(
        null,
    );

    const recoverReceipt = async (orderId: number) => {
        if (
            receiptRetryBusyRef.current ||
            !pendingReceipts.some((receipt) => receipt.orderId === orderId)
        )
            return;
        receiptRetryBusyRef.current = true;
        setReceiptRetryingId(orderId);
        try {
            // A confirmed payment is never sent again: receipt recovery is GET.
            const receipt = await retryReceipt(orderId);
            setConfirmedReceipt(receipt);
            setPendingReceipts((current) =>
                current.filter((entry) => entry.orderId !== orderId),
            );
            setReceiptOpen(true);
        } catch (reason) {
            setPendingReceipts((current) =>
                current.map((entry) =>
                    entry.orderId === orderId
                        ? {
                              ...entry,
                              error:
                                  reason instanceof Error
                                      ? reason.message
                                      : 'Struk belum dapat diambil. Coba lagi.',
                          }
                        : entry,
                ),
            );
        } finally {
            receiptRetryBusyRef.current = false;
            setReceiptRetryingId(null);
        }
    };

    return (
        <>
            <CashierView
                orders={orders}
                cashierStats={stats}
                pagination={{ page, lastPage, total }}
                onPageChange={setPage}
                onSearchChange={changeSearch}
                onFilterChange={changeFilter}
                user={user}
                settings={settings}
                serverMode
                isLoading={isLoading}
                isSaving={isSaving}
                confirmedOrderIds={confirmedOrderIds}
                receiptRecoveries={pendingReceipts.map((entry) => ({
                    ...entry,
                    isRetrying: receiptRetryingId === entry.orderId,
                    isDisabled: receiptRetryingId !== null,
                    onRetry: () => void recoverReceipt(entry.orderId),
                }))}
                serverError={error}
                onRetry={reload}
                onMarkPaid={async (id, method, cashReceived, expectedTotal) => {
                    if (method !== 'cash')
                        throw new Error(
                            'QRIS atau transfer belum terverifikasi. Hanya pembayaran tunai dapat dicatat.',
                        );
                    if (
                        !Number.isFinite(cashReceived) ||
                        !Number.isFinite(expectedTotal) ||
                        cashReceived === undefined ||
                        expectedTotal === undefined ||
                        cashReceived < expectedTotal
                    )
                        throw new Error(
                            'Nominal tunai tidak valid atau kurang dari total tagihan.',
                        );
                    const received = cashReceived.toFixed(2);
                    const expected = expectedTotal.toFixed(2);
                    const fingerprint = `${id}:${received}:${expected}`;
                    // Preserve the same UUID across a network timeout/retry.
                    if (attemptRef.current?.fingerprint !== fingerprint) {
                        attemptRef.current = {
                            fingerprint,
                            key: crypto.randomUUID(),
                        };
                    }
                    const outcome = await pay(
                        id,
                        received,
                        expected,
                        attemptRef.current.key,
                    );
                    if (outcome.receiptStatus === 'available') {
                        setConfirmedReceipt(outcome.receipt);
                        setReceiptOpen(true);
                    } else {
                        setPendingReceipts((current) => [
                            ...current.filter((entry) => entry.orderId !== id),
                            { orderId: id, error: outcome.receiptError },
                        ]);
                        setReceiptOpen(false);
                    }
                    return outcome;
                }}
            />
            {confirmedReceipt && !receiptOpen && (
                <div className="cashier-last-receipt">
                    <Button
                        variant="secondary"
                        size="medium"
                        onClick={() => setReceiptOpen(true)}
                    >
                        Lihat kembali struk lunas #
                        {confirmedReceipt.orderNumber}
                    </Button>
                </div>
            )}
            <ConfirmedReceiptModal
                receipt={receiptOpen ? confirmedReceipt : null}
                settings={settings}
                onClose={() => setReceiptOpen(false)}
            />
        </>
    );
}

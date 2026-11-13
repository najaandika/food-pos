import {
    Notification,
    NotificationViewport,
} from '../../../../../../components/base/notification/notification';

export function OwnerTablesApiFeedback({
    loadingTables,
    tablesError,
    tableCount,
    onReload,
}: {
    loadingTables: boolean;
    tablesError: string;
    tableCount: number;
    onReload: () => void;
}) {
    return (
        <div
            className="tables-api-feedback"
            role={tablesError ? 'alert' : 'status'}
        >
            <span>
                {loadingTables
                    ? 'Memuat meja yang tersimpan di server...'
                    : tablesError
                      ? tablesError
                      : tableCount === 0
                        ? 'Belum ada meja di database. Klik Tambah Meja, isi datanya, lalu Simpan untuk membuat QR.'
                        : 'Menampilkan meja yang tersimpan di server Laravel.'}
            </span>
            <button type="button" onClick={onReload} disabled={loadingTables}>
                Muat ulang
            </button>
        </div>
    );
}

export type OwnerTablesNotice = {
    id: number;
    message: string;
    isError: boolean;
    autoDismissDuration?: number;
};

/**
 * Uses the original BoardUI Notification and portalled viewport.
 * Only the latest action's feedback is visible; the keyed notification owns
 * its auto-dismiss timer, so an older action cannot dismiss a newer result.
 */
export function OwnerTablesToast({
    notice,
    onDismiss,
}: {
    notice: OwnerTablesNotice;
    onDismiss: (id: number) => void;
}) {
    return (
        <NotificationViewport
            position="bottom-end"
            aria-label="Notifikasi tindakan meja"
        >
            <Notification
                key={notice.id}
                title={notice.message}
                status={notice.isError ? 'error' : 'success'}
                autoDismissDuration={notice.autoDismissDuration}
                dismissible
                closeLabel="Tutup notifikasi"
                onDismiss={() => onDismiss(notice.id)}
                data-testid="owner-tables-notification"
            />
        </NotificationViewport>
    );
}

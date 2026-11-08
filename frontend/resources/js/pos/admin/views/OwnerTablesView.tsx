import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiAddLine, RiRefreshLine } from '@remixicon/react';
import { Button } from '../../../../../components/base/buttons/button';
import {
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
} from '../../../../../components/base/drawer/drawer';
import QRCode from 'qrcode';

import { AdminTitle } from '..';
import { ConfirmModal } from '../ConfirmModal';
import { useLocale } from '../i18n-context';
import type { AdminTable } from '../runtime-data';
import {
    OwnerTablesForm,
    type TableDraft,
} from './owner-tables/OwnerTablesForm';
import { OwnerTablesList } from './owner-tables/OwnerTablesList';
import { TablePrintStandee } from './owner-tables/TablePrintStandee';
import { TableManualCopyDialog } from './owner-tables/TableManualCopyDialog';
import {
    deleteSavedTable,
    getCustomerTableUrl,
    getSavedTables,
    peekSavedTables,
    saveSavedTable,
    rotateSavedTableQrToken,
    TableApiError,
} from './owner-tables/server-tables';

type TableStatus =
    | 'available'
    | 'occupied'
    | 'preparing'
    | 'ready'
    | 'waiting_payment'
    | 'need_waiter'
    | 'inactive';
type TableFilter = 'all' | 'available' | 'attention' | 'inactive';

type TableFormPayload = {
    code: string;
    name: string;
    area: string;
    seats: number;
    status: TableStatus;
};

const fallbackTables: AdminTable[] = [
    {
        code: 'A1',
        name: 'Indoor Window',
        area: 'Indoor',
        status: 'Available',
        rawStatus: 'available',
        seats: 2,
        scans: 18,
        lastOrder: 'No active order',
        tone: 'available',
    },
    {
        code: 'A4',
        name: 'Indoor Center',
        area: 'Indoor',
        status: 'Occupied',
        rawStatus: 'occupied',
        seats: 4,
        scans: 42,
        lastOrder: 'Order #925 - Ready',
        tone: 'occupied',
    },
    {
        code: 'B2',
        name: 'Bar Area',
        area: 'Bar',
        status: 'Preparing',
        rawStatus: 'preparing',
        seats: 2,
        scans: 31,
        lastOrder: 'Order #921 - 8 min',
        tone: 'preparing',
    },
    {
        code: 'B7',
        name: 'Outdoor Bench',
        area: 'Outdoor',
        status: 'Need Waiter',
        rawStatus: 'need_waiter',
        seats: 4,
        scans: 27,
        lastOrder: 'Customer call - 1 min',
        tone: 'call',
    },
    {
        code: 'C2',
        name: 'Terrace',
        area: 'Terrace',
        status: 'Waiting Payment',
        rawStatus: 'waiting_payment',
        seats: 3,
        scans: 22,
        lastOrder: 'Bill requested',
        tone: 'payment',
    },
    {
        code: 'O1',
        name: 'Outdoor Surf Corner',
        area: 'Outdoor',
        status: 'Inactive',
        rawStatus: 'inactive',
        seats: 4,
        scans: 9,
        lastOrder: 'QR paused',
        tone: 'inactive',
    },
];

const emptyDraft: TableDraft = {
    code: '',
    name: '',
    area: 'Indoor',
    seats: '2',
    status: 'available',
};

function draftFromTable(table?: AdminTable): TableDraft {
    if (!table) return emptyDraft;
    return {
        code: table.code,
        name: table.name,
        area: table.area,
        seats: String(table.seats),
        status:
            table.rawStatus ??
            (table.status.toLowerCase().replaceAll(' ', '_') as TableStatus),
    };
}

function payloadFromDraft(draft: TableDraft): TableFormPayload {
    return {
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        area: draft.area.trim(),
        seats: Number(draft.seats),
        status: draft.status,
    };
}

function fallbackClipboardCopy(url: string): boolean {
    const field = document.createElement('textarea');
    field.value = url;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.left = '-9999px';
    document.body.appendChild(field);
    field.focus();
    field.select();
    try {
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        field.remove();
    }
}

async function copyCustomerLink(url: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
            return true;
        }
    } catch {
        // Not a secure browser context or the user denied clipboard permission.
    }
    return fallbackClipboardCopy(url);
}

export function OwnerTablesView({
    tables,
    onCreateTable,
    onUpdateTable,
    onDeleteTable,
    serverMode = false,
}: {
    tables?: AdminTable[];
    serverMode?: boolean;
    onCreateTable?: (payload: TableFormPayload) => Promise<void> | void;
    onUpdateTable?: (
        tableId: number | undefined,
        payload: TableFormPayload,
    ) => Promise<void> | void;
    onDeleteTable?: (tableId: number | undefined) => Promise<void> | void;
}) {
    const { t } = useLocale();
    const [savedTables, setSavedTables] = useState<AdminTable[] | null>(() =>
        serverMode ? (peekSavedTables() ?? null) : null,
    );
    const [loadingTables, setLoadingTables] = useState(false);
    const [tablesError, setTablesError] = useState('');
    const [manualCopyUrl, setManualCopyUrl] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const cafeTables = serverMode
        ? (savedTables ?? [])
        : (tables ?? fallbackTables);

    const reloadSavedTables = useCallback(async (force = true) => {
        setLoadingTables(true);
        setTablesError('');
        try {
            const list = await getSavedTables(force);
            setSavedTables(list);
            if (list.length === 0) {
                setIsCreating(true);
                setSelectedId(undefined);
                setDraft(emptyDraft);
            }
        } catch (error) {
            // Keep the last confirmed list visible if a refresh fails.
            // An error banner makes the stale state explicit until retry.
            setTablesError(
                error instanceof Error
                    ? error.message
                    : 'Gagal memuat data meja.',
            );
        } finally {
            setLoadingTables(false);
        }
    }, []);

    useEffect(() => {
        if (serverMode) void reloadSavedTables(false);
    }, [serverMode, reloadSavedTables]);
    const [activeFilter, setActiveFilter] = useState<TableFilter>('all');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<number | undefined>(
        cafeTables[0]?.id,
    );
    const [isCreating, setIsCreating] = useState(false);
    const [draft, setDraft] = useState<TableDraft>(() =>
        draftFromTable(cafeTables[0]),
    );
    const [isSaving, setIsSaving] = useState(false);
    const [tableToPrint, setTableToPrint] = useState<AdminTable | null>(null);
    const [printUrl, setPrintUrl] = useState('');
    const [printQrImage, setPrintQrImage] = useState('');
    const [tableToDelete, setTableToDelete] = useState<AdminTable | null>(null);
    const [tableToRotate, setTableToRotate] = useState<AdminTable | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [copyToast, setCopyToast] = useState<string | null>(null);
    const [copyToastError, setCopyToastError] = useState(false);

    // Customer QR ordering updates the same Laravel table records.
    // Poll quietly only when the editor is closed, so an unsaved draft
    // cannot be overwritten by background status synchronization.
    const hasLoadedTables = savedTables !== null;
    useEffect(() => {
        if (!serverMode || !hasLoadedTables || drawerOpen || isSaving) return;

        let active = true;
        let inFlight = false;
        const synchronize = async () => {
            if (!active || inFlight || document.visibilityState === 'hidden')
                return;
            inFlight = true;
            try {
                const next = await getSavedTables();
                if (active) {
                    setSavedTables(next);
                    setTablesError('');
                }
            } catch (error) {
                if (active)
                    setTablesError(
                        error instanceof Error
                            ? error.message
                            : 'Gagal menyinkronkan status meja.',
                    );
            } finally {
                inFlight = false;
            }
        };

        const interval = window.setInterval(() => void synchronize(), 15000);
        const onResume = () => void synchronize();
        window.addEventListener('focus', onResume);
        document.addEventListener('visibilitychange', onResume);
        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener('focus', onResume);
            document.removeEventListener('visibilitychange', onResume);
        };
    }, [serverMode, hasLoadedTables, drawerOpen, isSaving]);

    const selectedTable = useMemo(
        () =>
            cafeTables.find((table) => table.id === selectedId) ??
            cafeTables[0],
        [cafeTables, selectedId],
    );

    useEffect(() => {
        if (isCreating) return;
        const nextTable =
            cafeTables.find((table) => table.id === selectedId) ??
            cafeTables[0];
        setSelectedId(nextTable?.id);
        setDraft(draftFromTable(nextTable));
    }, [cafeTables, selectedId, isCreating]);

    const filteredTables = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return cafeTables.filter((table) => {
            const status = table.rawStatus ?? 'available';
            const matchesFilter =
                activeFilter === 'all' ||
                (activeFilter === 'available' && status === 'available') ||
                (activeFilter === 'attention' &&
                    ['need_waiter', 'waiting_payment', 'ready'].includes(
                        status,
                    )) ||
                (activeFilter === 'inactive' && status === 'inactive');
            const matchesQuery =
                !normalizedQuery ||
                table.code.toLowerCase().includes(normalizedQuery) ||
                table.name.toLowerCase().includes(normalizedQuery) ||
                table.area.toLowerCase().includes(normalizedQuery);
            return matchesFilter && matchesQuery;
        });
    }, [activeFilter, cafeTables, query]);

    const tableStats = useMemo(
        () => [
            {
                label: t('ownerTables.activeQr'),
                value: String(
                    cafeTables.filter((table) => table.rawStatus !== 'inactive')
                        .length,
                ),
                hint: t('ownerTables.tablesOnline'),
            },
            {
                label: t('ownerTables.scansToday'),
                value: String(
                    cafeTables.reduce((total, table) => total + table.scans, 0),
                ),
                hint: t('ownerTables.fromQrLinks'),
            },
            {
                label: t('ownerTables.needAction'),
                value: String(
                    cafeTables.filter((table) =>
                        ['need_waiter', 'waiting_payment', 'ready'].includes(
                            table.rawStatus ?? '',
                        ),
                    ).length,
                ),
                hint: t('ownerTables.waiterOrPayment'),
            },
        ],
        [cafeTables, t],
    );

    const startCreate = () => {
        setDrawerOpen(true);
        setIsCreating(true);
        setSelectedId(undefined);
        setDraft(emptyDraft);
    };

    const startEdit = (table: AdminTable) => {
        setDrawerOpen(true);
        setIsCreating(false);
        setSelectedId(table.id);
        setDraft(draftFromTable(table));
    };

    const clearFilters = () => {
        setActiveFilter('all');
        setQuery('');
    };

    const discardTableDraft = () => {
        setDrawerOpen(false);
        if (isCreating) {
            const firstTable = cafeTables[0];
            setIsCreating(false);
            setSelectedId(firstTable?.id);
            setDraft(draftFromTable(firstTable));
            return;
        }
        setDraft(draftFromTable(selectedTable));
    };

    const resolveCustomerUrl = (table: AdminTable) => {
        if (table.rawStatus === 'inactive')
            throw new TableApiError(
                'Meja belum aktif. Aktifkan kembali sebelum membagikan QR.',
                409,
            );
        return getCustomerTableUrl(table);
    };

    const handleCopyLink = async (table: AdminTable) => {
        try {
            const url = await resolveCustomerUrl(table);
            setCopyToastError(false);
            if (await copyCustomerLink(url)) {
                setCopiedCode(table.code);
                setCopyToast(
                    `${t('ownerTables.linkCopiedSuccess')} ${table.code}`,
                );
                window.setTimeout(() => setCopiedCode(null), 2000);
                window.setTimeout(() => setCopyToast(null), 2800);
            } else {
                setDrawerOpen(false);
                setManualCopyUrl(url);
                setCopyToastError(true);
                setCopyToast(
                    'Browser menolak akses clipboard. Salin tautan secara manual dari dialog.',
                );
            }
        } catch (error) {
            setCopyToastError(true);
            setCopyToast(
                error instanceof TableApiError
                    ? error.message
                    : 'Gagal mengambil tautan meja.',
            );
            window.setTimeout(() => setCopyToast(null), 4500);
        }
    };

    const retryManualCopy = () => {
        if (!manualCopyUrl) return;
        void copyCustomerLink(manualCopyUrl).then((copied) => {
            if (copied) {
                setManualCopyUrl(null);
                setCopyToast('Tautan QR berhasil disalin.');
                window.setTimeout(() => setCopyToast(null), 3000);
            }
        });
    };
    const handlePrintTable = async (table: AdminTable) => {
        try {
            const url = await resolveCustomerUrl(table);
            const image = await QRCode.toDataURL(url, {
                width: 340,
                margin: 2,
                errorCorrectionLevel: 'H',
            });
            setPrintUrl(url);
            setPrintQrImage(image);
            setDrawerOpen(false);
            setTableToPrint(table);
        } catch (error) {
            setCopyToastError(true);
            setCopyToast(
                error instanceof TableApiError
                    ? error.message
                    : 'Gagal membuat QR meja.',
            );
            window.setTimeout(() => setCopyToast(null), 4500);
        }
    };

    const saveTable = async () => {
        const payload = payloadFromDraft(draft);
        if (
            !payload.code ||
            !payload.name ||
            !payload.area ||
            !Number.isInteger(payload.seats) ||
            payload.seats <= 0
        )
            return;
        if (serverMode && tablesError) {
            setCopyToastError(true);
            setCopyToast(
                'Data meja belum tersedia. Coba muat ulang terlebih dahulu.',
            );
            return;
        }
        setIsSaving(true);
        setCopyToast(null);
        try {
            if (serverMode) {
                const savedId = await saveSavedTable(
                    payload,
                    isCreating ? undefined : selectedTable?.id,
                );
                setSelectedId(savedId);
                setIsCreating(false);
                await reloadSavedTables();
                setDrawerOpen(false);
                setCopyToastError(false);
                setCopyToast(
                    isCreating
                        ? 'Meja berhasil disimpan. QR sekarang tersedia.'
                        : 'Data meja berhasil diperbarui.',
                );
                window.setTimeout(() => setCopyToast(null), 4200);
            } else if (isCreating) {
                await onCreateTable?.(payload);
                setIsCreating(false);
            } else {
                await onUpdateTable?.(selectedTable?.id, payload);
            }
        } catch (error) {
            setCopyToastError(true);
            setCopyToast(
                error instanceof TableApiError
                    ? error.message
                    : 'Gagal menyimpan meja. Periksa koneksi lalu coba lagi.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    const requestRotateTableQr = (table: AdminTable) => {
        if (!serverMode || !table.id || isSaving) return;
        setDrawerOpen(false);
        setTableToRotate(table);
    };

    const confirmRotateTableQr = async () => {
        if (!tableToRotate?.id) return;
        const tableId = tableToRotate.id;
        setTableToRotate(null);
        try {
            await rotateSavedTableQrToken(tableId);
            // Never keep an obsolete print/copy QR after rotating the token.
            setPrintQrImage('');
            setPrintUrl('');
            setTableToPrint(null);
            setCopiedCode(null);
            await reloadSavedTables();
            setCopyToastError(false);
            setCopyToast(
                'Kode QR baru sudah aktif. Cetak ulang standee atau salin tautan baru; QR lama tidak berlaku.',
            );
            window.setTimeout(() => setCopyToast(null), 6000);
        } catch (error) {
            setCopyToastError(true);
            setCopyToast(
                error instanceof TableApiError
                    ? error.message
                    : 'Gagal mengganti kode QR. Silakan coba lagi.',
            );
        }
    };

    const requestDeleteTable = (table = selectedTable) => {
        if (!table?.id) return;
        setDrawerOpen(false);
        setTableToDelete(table);
    };

    const confirmDeleteTable = async () => {
        if (!tableToDelete?.id) return;
        const tableId = tableToDelete.id;
        setTableToDelete(null);
        try {
            if (serverMode) {
                await deleteSavedTable(tableId);
                setSelectedId(undefined);
                await reloadSavedTables();
                setCopyToastError(false);
                setCopyToast('Meja telah dihapus dari server.');
                window.setTimeout(() => setCopyToast(null), 4200);
            } else {
                await onDeleteTable?.(tableId);
            }
        } catch (error) {
            setCopyToastError(true);
            setCopyToast(
                error instanceof TableApiError
                    ? error.message
                    : 'Gagal menghapus meja. Periksa koneksi.',
            );
        }
    };

    return (
        <section className="app-view active owner-tables-p1">
            <header className="topbar">
                <AdminTitle
                    title={t('ownerTables.title')}
                    subtitle={t('ownerTables.subtitle')}
                />
                {serverMode && (
                    <Button
                        variant="secondary"
                        leadingIcon={RiRefreshLine}
                        disabled={loadingTables || isSaving}
                        onClick={() => void reloadSavedTables()}
                    >
                        Sinkronkan
                    </Button>
                )}
                <Button
                    leadingIcon={RiAddLine}
                    className="tables-p1-add-button pos-boardui-add-button"
                    aria-label={t('ownerTables.addTable')}
                    disabled={
                        serverMode && (loadingTables || Boolean(tablesError))
                    }
                    onClick={startCreate}
                >
                    {t('ownerTables.addTable')}
                </Button>
            </header>

            {serverMode && (loadingTables || Boolean(tablesError)) && (
                <div
                    className="tables-api-feedback"
                    role={tablesError ? 'alert' : 'status'}
                >
                    <span>
                        {loadingTables
                            ? 'Memuat meja yang tersimpan di server...'
                            : tablesError
                              ? tablesError
                              : cafeTables.length === 0
                                ? 'Belum ada meja di database. Klik Tambah Meja, isi datanya, lalu Simpan untuk membuat QR.'
                                : 'Menampilkan meja yang tersimpan di server Laravel.'}
                    </span>
                    <button
                        type="button"
                        onClick={() => void reloadSavedTables()}
                        disabled={loadingTables}
                    >
                        Muat ulang
                    </button>
                </div>
            )}

            <div className="tables-layout tables-p1-layout">
                <OwnerTablesList
                    tables={cafeTables}
                    filteredTables={filteredTables}
                    tableStats={tableStats}
                    activeFilter={activeFilter}
                    query={query}
                    selectedId={selectedId}
                    isCreating={isCreating && drawerOpen}
                    selectedTable={drawerOpen ? selectedTable : undefined}
                    copiedCode={copiedCode}
                    onChangeFilter={setActiveFilter}
                    onChangeQuery={setQuery}
                    onClearFilters={clearFilters}
                    onStartEdit={startEdit}
                    onPrintTable={handlePrintTable}
                    onCopyLink={handleCopyLink}
                />
            </div>

            <Drawer
                placement="end"
                size="md"
                className="tables-p1-drawer-dialog"
                overlayClassName="tables-p1-drawer-overlay"
                isOpen={drawerOpen}
                onOpenChange={(open) => {
                    if (!open && isSaving) return;
                    if (!open) discardTableDraft();
                    else setDrawerOpen(true);
                }}
                isDismissable={!isSaving}
                isKeyboardDismissDisabled={isSaving}
            >
                <DrawerHeader
                    title={
                        isCreating
                            ? t('ownerTables.addTable')
                            : t('ownerTables.selectedTable')
                    }
                    description={
                        isCreating
                            ? 'Isi data meja. Tautan QR tersedia setelah meja disimpan.'
                            : 'Perbarui data meja, kelola QR, atau cetak standee.'
                    }
                />
                <DrawerBody className="tables-p1-drawer-body">
                    <OwnerTablesForm
                        draft={draft}
                        onChangeDraft={setDraft}
                        isCreating={isCreating}
                        selectedTable={selectedTable}
                        isSaving={isSaving}
                        onSave={saveTable}
                        onDelete={() => requestDeleteTable()}
                        onDiscard={discardTableDraft}
                        onPrintTable={handlePrintTable}
                        onCopyLink={handleCopyLink}
                        onRotateQr={
                            serverMode ? requestRotateTableQr : undefined
                        }
                        hideActions
                    />
                </DrawerBody>
                <DrawerFooter className="tables-p1-drawer-footer">
                    <Button
                        variant="secondary"
                        onClick={discardTableDraft}
                        disabled={isSaving}
                    >
                        {t('common.discard')}
                    </Button>
                    <Button
                        onClick={() => void saveTable()}
                        disabled={isSaving}
                    >
                        {isSaving
                            ? t('common.saving')
                            : t('ownerTables.saveTable')}
                    </Button>
                </DrawerFooter>
            </Drawer>
            {/* QR Standee & Sticker Print Modal */}
            {tableToPrint && (
                <TablePrintStandee
                    table={tableToPrint}
                    url={printUrl}
                    qrImage={printQrImage}
                    t={t}
                    onClose={() => setTableToPrint(null)}
                    onPrint={() => window.print()}
                />
            )}

            {manualCopyUrl && (
                <TableManualCopyDialog
                    url={manualCopyUrl}
                    onClose={() => setManualCopyUrl(null)}
                    onRetryCopy={retryManualCopy}
                />
            )}
            {/* Feedback Toast */}
            {copyToast && (
                <div
                    className={
                        'admin-action-toast ' +
                        (copyToastError ? 'error' : 'success')
                    }
                    role={copyToastError ? 'alert' : 'status'}
                >
                    {copyToast}
                </div>
            )}

            <ConfirmModal
                isOpen={Boolean(tableToRotate)}
                title="Ganti kode QR meja?"
                message="Tautan dan QR yang sudah dicetak akan langsung tidak berlaku. Pesanan dan data meja tidak akan terhapus. Lanjutkan?"
                targetName={
                    tableToRotate ? 'Meja ' + tableToRotate.code : undefined
                }
                confirmLabel="Ganti kode QR"
                cancelLabel={t('common.cancel')}
                isDanger
                onConfirm={confirmRotateTableQr}
                onCancel={() => setTableToRotate(null)}
            />

            <ConfirmModal
                isOpen={Boolean(tableToDelete)}
                title={t('ownerTables.deleteTitle')}
                message={t('ownerTables.deleteConfirm')}
                targetName={
                    tableToDelete
                        ? `${t('ownerTables.tableCode')} ${tableToDelete.code}`
                        : undefined
                }
                targetDetails={
                    tableToDelete
                        ? `${tableToDelete.area} • ${tableToDelete.seats} ${t('ownerTables.seats')}`
                        : undefined
                }
                confirmLabel={t('ownerTables.deleteConfirmAction')}
                cancelLabel={t('common.cancel')}
                isDanger={true}
                onConfirm={confirmDeleteTable}
                onCancel={() => setTableToDelete(null)}
            />
        </section>
    );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiRefreshLine } from '@remixicon/react';
import { Button } from '../../../../../../components/base/buttons/button';
import {
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
} from '../../../../../../components/base/drawer/drawer';
import QRCode from 'qrcode';

import { AdminTitle } from '../..';
import { ConfirmModal } from '../../ConfirmModal';
import { useLocale } from '../../i18n-context';
import type { AdminTable } from '../../runtime-data';
import { OwnerTablesForm, type TableDraft } from './OwnerTablesForm';
import { OwnerTablesList } from './OwnerTablesList';
import { TablePrintStandee } from './TablePrintStandee';
import { TableManualCopyDialog } from './TableManualCopyDialog';
import { fallbackTables, emptyDraft } from './owner-tables-demo-data';
import {
    OwnerTablesApiFeedback,
    OwnerTablesToast,
    type OwnerTablesNotice,
} from './OwnerTablesFeedback';
import {
    deleteSavedTable,
    getCustomerTableUrl,
    getSavedTables,
    peekSavedTables,
    saveSavedTable,
    rotateSavedTableQrToken,
    TableApiError,
} from './server-tables';

type TableStatus =
    | 'available'
    | 'occupied'
    | 'preparing'
    | 'ready'
    | 'waiting_payment'
    | 'need_waiter'
    | 'inactive';
type TableFilter = 'all' | 'available' | 'attention' | 'inactive';

type TableModalLauncher = {
    element: HTMLElement | null;
    code: string;
    action: 'print' | 'copy';
};

type TableConfirmLauncher = {
    element: HTMLElement | null;
    code: string;
    action: 'rotate' | 'delete';
};

function restoreTableConfirmFocus(launcher: TableConfirmLauncher | null) {
    if (!launcher) return;
    const isUsable = (element: HTMLElement | null | undefined) =>
        Boolean(
            element?.isConnected &&
            element !== document.body &&
            element.matches(
                'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])',
            ) &&
            element.getClientRects().length > 0 &&
            !element.matches(':disabled') &&
            !element.closest(
                '[inert], [aria-hidden="true"], .tables-p1-drawer-dialog',
            ),
        );

    const cards = Array.from(
        document.querySelectorAll<HTMLElement>(
            '.owner-tables-p1 .qr-table-card',
        ),
    );
    const matchingCard = cards.find(
        (card) =>
            card.querySelector('.table-pill')?.textContent?.trim() ===
            launcher.code,
    );
    const candidates: Array<HTMLElement | null | undefined> = [
        launcher.element,
        matchingCard?.querySelector<HTMLElement>('.qr-card-top'),
        ...cards.map((card) => card.querySelector<HTMLElement>('.qr-card-top')),
        document.querySelector<HTMLElement>(
            '.owner-tables-p1 .tables-p1-add-button',
        ),
        document.querySelector<HTMLElement>(
            '.owner-tables-p1 .topbar button:not([disabled])',
        ),
    ];
    candidates.find(isUsable)?.focus({ preventScroll: true });
}

const tableModalFocusableSelector =
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function handleTableModalKeyDown(
    event: KeyboardEvent,
    dialog: HTMLElement,
    onClose: () => void,
) {
    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
    }
    if (event.key !== 'Tab') return;

    const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(tableModalFocusableSelector),
    ).filter(
        (element) =>
            element.getClientRects().length > 0 &&
            !element.matches(':disabled') &&
            !element.closest('[inert], [aria-hidden="true"]'),
    );

    if (controls.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
    }

    const first = controls[0];
    const last = controls[controls.length - 1];
    const current = document.activeElement;
    if (!dialog.contains(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
    }
}

function restoreTableModalLauncher(
    launcher: TableModalLauncher | null,
    copyLabel: string,
) {
    if (!launcher) return;
    const canFocus = (element: HTMLElement | null | undefined) =>
        Boolean(
            element?.isConnected &&
            element.getClientRects().length > 0 &&
            !element.matches(':disabled') &&
            !element.closest('[inert], [aria-hidden="true"]') &&
            !element.closest('.tables-p1-drawer-dialog'),
        );
    if (canFocus(launcher.element)) {
        launcher.element?.focus();
        return;
    }

    // BoardUI closes/unmounts a Drawer before showing the modal. Its button
    // is no longer a valid focus target; return to that table's list action.
    const card = Array.from(
        document.querySelectorAll<HTMLElement>(
            '.owner-tables-p1 .qr-table-card',
        ),
    ).find(
        (item) =>
            item
                .querySelector('.table-pill')
                ?.getAttribute('data-table-code') === launcher.code,
    );
    const fallback =
        launcher.action === 'print'
            ? card?.querySelector<HTMLElement>('.tables-qr-preview-trigger')
            : Array.from(
                  card?.querySelectorAll<HTMLElement>('button[aria-label]') ??
                      [],
              ).find(
                  (button) =>
                      button.getAttribute('aria-label') ===
                      `${copyLabel} ${launcher.code}`,
              );
    if (canFocus(fallback)) fallback?.focus();
}

type TableFormPayload = {
    code: string;
    name: string;
    area: string;
    seats: number;
    status: TableStatus;
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
    const [notice, setNotice] = useState<OwnerTablesNotice | null>(null);
    const noticeSequenceRef = useRef(0);
    const notify = (
        message: string,
        isError: boolean,
        autoDismissDuration?: number,
    ) => {
        setNotice({
            id: ++noticeSequenceRef.current,
            message,
            isError,
            autoDismissDuration,
        });
    };
    const tableModalLauncherRef = useRef<TableModalLauncher | null>(null);
    const confirmLauncherRef = useRef<TableConfirmLauncher | null>(null);
    const printDialogRef = useRef<HTMLDivElement>(null);
    const manualDialogRef = useRef<HTMLDivElement>(null);
    const copyLabelRef = useRef(t('ownerTables.copyLink'));
    copyLabelRef.current = t('ownerTables.copyLink');
    const printDialogOpen = Boolean(tableToPrint);
    const manualDialogOpen = Boolean(manualCopyUrl);
    const confirmationOpen = Boolean(tableToRotate || tableToDelete);

    useEffect(() => {
        if (confirmationOpen) return;
        const launcher = confirmLauncherRef.current;
        if (!launcher) return;

        // ConfirmModal may restore focus to a trigger that the closing Drawer
        // already unmounted. Wait for the modal commit and its effect cleanup,
        // then focus a live action for the same table (or a visible fallback).
        const frame = window.requestAnimationFrame(() => {
            if (confirmLauncherRef.current !== launcher) return;
            restoreTableConfirmFocus(launcher);
            confirmLauncherRef.current = null;
        });
        return () => window.cancelAnimationFrame(frame);
    }, [confirmationOpen]);

    useEffect(() => {
        if (!printDialogOpen && !manualDialogOpen) return;
        const dialog = printDialogOpen
            ? printDialogRef.current
            : manualDialogRef.current;
        if (!dialog) return;

        const initialFocus = () => {
            if (!dialog.isConnected) return;
            if (printDialogOpen) {
                dialog
                    .querySelector<HTMLButtonElement>('.standee-modal-close')
                    ?.focus({ preventScroll: true });
            } else {
                const input =
                    dialog.querySelector<HTMLInputElement>('#customer-qr-url');
                input?.focus({ preventScroll: true });
                input?.select();
            }
        };
        initialFocus();
        // A closing BoardUI Drawer may restore its own focus after commit.
        // Reassert focus inside the active modal once that transition starts.
        const frame = window.requestAnimationFrame(initialFocus);
        const onKeyDown = (event: KeyboardEvent) =>
            handleTableModalKeyDown(event, dialog, () => {
                if (printDialogOpen) setTableToPrint(null);
                else setManualCopyUrl(null);
            });
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            window.cancelAnimationFrame(frame);
            window.requestAnimationFrame(() =>
                restoreTableModalLauncher(
                    tableModalLauncherRef.current,
                    copyLabelRef.current,
                ),
            );
        };
    }, [printDialogOpen, manualDialogOpen]);

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
            if (await copyCustomerLink(url)) {
                setCopiedCode(table.code);
                notify(
                    `${t('ownerTables.linkCopiedSuccess')} ${table.code}`,
                    false,
                    2800,
                );
                window.setTimeout(() => setCopiedCode(null), 2000);
            } else {
                setDrawerOpen(false);
                setManualCopyUrl(url);
                notify(
                    'Browser menolak akses clipboard. Salin tautan secara manual dari dialog.',
                    true,
                );
            }
        } catch (error) {
            notify(
                error instanceof TableApiError
                    ? error.message
                    : 'Gagal mengambil tautan meja.',
                true,
                4500,
            );
        }
    };

    const retryManualCopy = () => {
        if (!manualCopyUrl) return;
        void copyCustomerLink(manualCopyUrl).then((copied) => {
            if (copied) {
                setManualCopyUrl(null);
                notify('Tautan QR berhasil disalin.', false, 3000);
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
            notify(
                error instanceof TableApiError
                    ? error.message
                    : 'Gagal membuat QR meja.',
                true,
                4500,
            );
        }
    };

    const openTablePrint = (table: AdminTable) => {
        tableModalLauncherRef.current = {
            element:
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null,
            code: table.code,
            action: 'print',
        };
        void handlePrintTable(table);
    };

    const openTableCopy = (table: AdminTable) => {
        tableModalLauncherRef.current = {
            element:
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null,
            code: table.code,
            action: 'copy',
        };
        void handleCopyLink(table);
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
            notify(
                'Data meja belum tersedia. Coba muat ulang terlebih dahulu.',
                true,
            );
            return;
        }
        setIsSaving(true);
        setNotice(null);
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
                notify(
                    isCreating
                        ? 'Meja berhasil disimpan. QR sekarang tersedia.'
                        : 'Data meja berhasil diperbarui.',
                    false,
                    4200,
                );
            } else if (isCreating) {
                await onCreateTable?.(payload);
                setIsCreating(false);
                if (onCreateTable)
                    notify('Meja berhasil ditambahkan.', false, 4200);
            } else {
                await onUpdateTable?.(selectedTable?.id, payload);
                if (onUpdateTable)
                    notify('Data meja berhasil diperbarui.', false, 4200);
            }
        } catch (error) {
            notify(
                error instanceof TableApiError
                    ? error.message
                    : 'Gagal menyimpan meja. Periksa koneksi lalu coba lagi.',
                true,
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
            notify(
                'Kode QR baru sudah aktif. Cetak ulang standee atau salin tautan baru; QR lama tidak berlaku.',
                false,
                6000,
            );
        } catch (error) {
            notify(
                error instanceof TableApiError
                    ? error.message
                    : 'Gagal mengganti kode QR. Silakan coba lagi.',
                true,
            );
        }
    };

    const requestDeleteTable = (table = selectedTable) => {
        if (!table?.id) return;
        setDrawerOpen(false);
        setTableToDelete(table);
    };

    const openRotateConfirmation = (table: AdminTable) => {
        if (!serverMode || !table.id || isSaving) return;
        confirmLauncherRef.current = {
            element:
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null,
            code: table.code,
            action: 'rotate',
        };
        requestRotateTableQr(table);
    };

    const openDeleteConfirmation = (table = selectedTable) => {
        if (!table?.id) return;
        confirmLauncherRef.current = {
            element:
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null,
            code: table.code,
            action: 'delete',
        };
        requestDeleteTable(table);
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
                notify('Meja telah dihapus dari server.', false, 4200);
            } else {
                await onDeleteTable?.(tableId);
                if (onDeleteTable)
                    notify('Meja berhasil dihapus.', false, 4200);
            }
        } catch (error) {
            notify(
                error instanceof TableApiError
                    ? error.message
                    : 'Gagal menghapus meja. Periksa koneksi.',
                true,
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
                <OwnerTablesApiFeedback
                    loadingTables={loadingTables}
                    tablesError={tablesError}
                    tableCount={cafeTables.length}
                    onReload={() => void reloadSavedTables()}
                />
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
                    onPrintTable={openTablePrint}
                    onCopyLink={openTableCopy}
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
                        onDelete={() => openDeleteConfirmation()}
                        onDiscard={discardTableDraft}
                        onPrintTable={openTablePrint}
                        onCopyLink={openTableCopy}
                        onRotateQr={
                            serverMode ? openRotateConfirmation : undefined
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
                    dialogRef={printDialogRef}
                />
            )}

            {manualCopyUrl && (
                <TableManualCopyDialog
                    url={manualCopyUrl}
                    onClose={() => setManualCopyUrl(null)}
                    onRetryCopy={retryManualCopy}
                    dialogRef={manualDialogRef}
                />
            )}
            {notice && (
                <OwnerTablesToast
                    notice={notice}
                    onDismiss={(id) =>
                        setNotice((current) =>
                            current?.id === id ? null : current,
                        )
                    }
                />
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

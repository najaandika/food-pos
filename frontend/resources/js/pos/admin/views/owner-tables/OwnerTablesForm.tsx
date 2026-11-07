import {
    RiDeleteBin6Line,
    RiFileCopyLine,
    RiPrinterLine,
    RiQrCodeLine,
    RiRefreshLine,
} from '@remixicon/react';

import { Badge } from '../../../../../../components/base/badges/badge';
import { StatusDot } from '../../../../../../components/base/badges/status-dot';
import { Button } from '../../../../../../components/base/buttons/button';
import { IconButton } from '../../../../../../components/base/buttons/icon-button';
import { Input } from '../../../../../../components/base/input/input';
import { NumberField } from '../../../../../../components/base/number-field/number-field';
import {
    Select,
    SelectItem,
} from '../../../../../../components/base/select/select';
import { useLocale } from '../../i18n-context';
import type { AdminTable } from '../../runtime-data';
import {
    getTableStatusDotColor,
    getTableStatusLabel,
    type TableStatusValue,
} from './table-status';

type TableDraft = {
    code: string;
    name: string;
    area: string;
    seats: string;
    status: TableStatusValue;
};

const areaOptions = ['Indoor', 'Outdoor', 'Bar', 'Terrace'];
const statusOptions: TableStatusValue[] = [
    'available',
    'occupied',
    'preparing',
    'ready',
    'waiting_payment',
    'need_waiter',
    'inactive',
];

type Props = {
    draft: TableDraft;
    onChangeDraft: (updater: (current: TableDraft) => TableDraft) => void;
    isCreating: boolean;
    selectedTable: AdminTable | undefined;
    isSaving: boolean;
    onSave: () => void;
    onDelete: () => void;
    onDiscard: () => void;
    onPrintTable?: (table: AdminTable) => void;
    onCopyLink?: (table: AdminTable) => void;
    onRotateQr?: (table: AdminTable) => void;
    hideActions?: boolean;
};

export function OwnerTablesForm({
    draft,
    onChangeDraft,
    isCreating,
    selectedTable,
    isSaving,
    onSave,
    onDelete,
    onDiscard,
    onPrintTable,
    onCopyLink,
    onRotateQr,
    hideActions = false,
}: Props) {
    const { t, locale } = useLocale();
    const isPersisted = !isCreating && Boolean(selectedTable?.id);
    const isQrInactive = isPersisted && selectedTable?.rawStatus === 'inactive';
    const customerLink = isQrInactive
        ? locale === 'id'
            ? 'QR tidak aktif. Aktifkan meja sebelum membagikannya.'
            : 'QR is inactive. Enable the table before sharing it.'
        : isPersisted
          ? locale === 'id'
              ? 'Tautan QR tersedia untuk meja ini'
              : 'QR link is ready for this table'
          : locale === 'id'
            ? 'Simpan meja untuk mengaktifkan QR'
            : 'Save the table to activate its QR';

    return (
        <div className="qr-editor-panel tables-p2-editor">
            <div className="qr-panel-head">
                <Badge color={isCreating ? 'primary' : 'neutral'}>
                    {isCreating
                        ? t('ownerTables.newTable')
                        : t('ownerTables.selectedTable')}
                </Badge>
                {!isCreating && selectedTable?.id && (
                    <IconButton
                        icon={RiDeleteBin6Line}
                        size="small"
                        className="tables-p2-delete"
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                        onClick={onDelete}
                        disabled={isSaving}
                    />
                )}
            </div>

            {isPersisted && (
                <div className="qr-large-preview">
                    <span className="tables-drawer-qr-icon" aria-hidden="true">
                        <RiQrCodeLine className="size-8" />
                    </span>
                    <strong>
                        {t('ownerTables.tableLabel')}{' '}
                        {draft.code || t('ownerTables.newLabel')}
                    </strong>
                    <p>{customerLink}</p>
                    {isPersisted && selectedTable && onPrintTable && (
                        <Button
                            variant="secondary"
                            size="small"
                            leadingIcon={RiPrinterLine}
                            className="tables-p2-print-button"
                            onClick={() => onPrintTable(selectedTable)}
                            disabled={isSaving || isQrInactive}
                        >
                            {t('ownerTables.printStandee')}
                        </Button>
                    )}
                </div>
            )}

            {isPersisted && (
                <div className="qr-link-box">
                    <span className="text-caption-1-semibold">
                        {t('ownerTables.customerLink')}
                    </span>
                    <strong className="text-body-medium">{customerLink}</strong>
                    <Button
                        variant="secondary"
                        size="small"
                        leadingIcon={RiFileCopyLine}
                        disabled={
                            !isPersisted ||
                            !onCopyLink ||
                            isSaving ||
                            isQrInactive
                        }
                        onClick={() => {
                            if (selectedTable) onCopyLink?.(selectedTable);
                        }}
                    >
                        {t('common.copy')}
                    </Button>
                </div>
            )}

            {isPersisted && selectedTable && onRotateQr && (
                <div className="tables-p7-qr-security">
                    <p className="text-caption-1-regular">
                        {locale === 'id'
                            ? 'Kode QR bersifat rahasia. Jika tautannya tersebar, ganti kode QR agar tautan lama tidak berlaku.'
                            : 'QR links are private. If a link is shared unexpectedly, regenerate its QR code to revoke the old link.'}
                    </p>
                    <Button
                        variant="secondary"
                        size="small"
                        leadingIcon={RiRefreshLine}
                        disabled={isSaving}
                        onClick={() => onRotateQr(selectedTable)}
                    >
                        {locale === 'id'
                            ? 'Ganti kode QR'
                            : 'Regenerate QR code'}
                    </Button>
                </div>
            )}

            <div className="tables-p2-form-fields">
                <Input
                    fieldClassName="tables-focus-field"
                    label={t('ownerTables.tableCode')}
                    value={draft.code}
                    autoFocus
                    isRequired
                    maxLength={30}
                    placeholder="A01"
                    hint={
                        locale === 'id'
                            ? 'Kode unik, maksimal 30 karakter.'
                            : 'Unique code, up to 30 characters.'
                    }
                    isDisabled={isSaving}
                    onChange={(code) =>
                        onChangeDraft((current) => ({
                            ...current,
                            code: code.toUpperCase(),
                        }))
                    }
                />
                <Input
                    fieldClassName="tables-focus-field"
                    label={t('ownerTables.displayName')}
                    value={draft.name}
                    isRequired
                    maxLength={80}
                    placeholder={
                        locale === 'id' ? 'Meja Dekat Jendela' : 'Window Table'
                    }
                    isDisabled={isSaving}
                    onChange={(name) =>
                        onChangeDraft((current) => ({ ...current, name }))
                    }
                />
                <Select
                    label={t('ownerTables.area')}
                    aria-label={t('ownerTables.area')}
                    className="tables-p2-select"
                    triggerClassName="tables-focus-select"
                    selectedKey={draft.area}
                    isDisabled={isSaving}
                    onSelectionChange={(key) => {
                        if (key !== null)
                            onChangeDraft((current) => ({
                                ...current,
                                area: String(key),
                            }));
                    }}
                >
                    {areaOptions.map((area) => (
                        <SelectItem id={area} key={area}>
                            {area}
                        </SelectItem>
                    ))}
                </Select>
                <NumberField
                    fieldClassName="tables-focus-field"
                    label={t('ownerTables.seats')}
                    value={Number(draft.seats) || 1}
                    minValue={1}
                    maxValue={100}
                    step={1}
                    isRequired
                    isDisabled={isSaving}
                    isWheelDisabled
                    formatOptions={{ maximumFractionDigits: 0 }}
                    hint={
                        locale === 'id'
                            ? 'Kapasitas 1–100 orang.'
                            : 'Capacity from 1 to 100 guests.'
                    }
                    onChange={(seats) =>
                        onChangeDraft((current) => ({
                            ...current,
                            seats: String(seats),
                        }))
                    }
                />
                <Select
                    label={t('ownerTables.status')}
                    aria-label={t('ownerTables.status')}
                    className="tables-p2-select"
                    triggerClassName="tables-focus-select"
                    selectedKey={draft.status}
                    isDisabled={isSaving}
                    onSelectionChange={(key) => {
                        if (key !== null)
                            onChangeDraft((current) => ({
                                ...current,
                                status: String(key) as TableStatusValue,
                            }));
                    }}
                >
                    {statusOptions.map((status) => (
                        <SelectItem
                            id={status}
                            key={status}
                            textValue={getTableStatusLabel(status, locale)}
                        >
                            <span className="tables-p2-status-option">
                                <StatusDot
                                    color={getTableStatusDotColor(status)}
                                />
                                {getTableStatusLabel(status, locale)}
                            </span>
                        </SelectItem>
                    ))}
                </Select>
            </div>

            {isPersisted && (
                <div className="tables-p2-health">
                    <div className="tables-p2-health-title text-caption-1-semibold">
                        {locale === 'id' ? 'Informasi meja' : 'Table overview'}
                    </div>
                    <div className="tables-p2-health-row">
                        <span>{t('ownerTables.qrStatus')}</span>
                        <strong className="tables-p2-status-option">
                            <StatusDot
                                color={getTableStatusDotColor(draft.status)}
                            />
                            {getTableStatusLabel(draft.status, locale)}
                        </strong>
                    </div>
                    <div className="tables-p2-health-row">
                        <span>{t('ownerTables.scansToday')}</span>
                        <strong className="tabular-nums">
                            {selectedTable?.scans ?? 0}
                        </strong>
                    </div>
                    <div className="tables-p2-health-row">
                        <span>{t('ownerTables.currentOrder')}</span>
                        <strong>
                            {selectedTable?.currentOrderId
                                ? '#' + selectedTable.currentOrderId
                                : '—'}
                        </strong>
                    </div>
                </div>
            )}

            {!hideActions && (
                <div className="editor-actions table-editor-actions">
                    <Button
                        variant="secondary"
                        onClick={onDiscard}
                        disabled={isSaving}
                    >
                        {t('common.discard')}
                    </Button>
                    <Button onClick={onSave} disabled={isSaving}>
                        {isSaving
                            ? t('common.saving')
                            : t('ownerTables.saveTable')}
                    </Button>
                </div>
            )}
        </div>
    );
}

export type { TableDraft };

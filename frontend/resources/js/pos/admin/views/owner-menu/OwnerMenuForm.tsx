import { RiDeleteBin6Line as Trash2 } from '@remixicon/react';
import Image from '@/pos/components/pos-image';
import { FileUpload } from '../../../../../../components/base/file-upload/file-upload';
import { Badge } from '../../../../../../components/base/badges/badge';
import { Button } from '../../../../../../components/base/buttons/button';
import { IconButton } from '../../../../../../components/base/buttons/icon-button';
import { Input } from '../../../../../../components/base/input/input';
import {
    Select,
    SelectItem,
} from '../../../../../../components/base/select/select';
import { Textarea } from '../../../../../../components/base/textarea/textarea';
import type { AdminDish } from '../../runtime-data';
import { useLocale } from '../../i18n-context';

const FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80';

type MenuDraft = {
    name: string;
    category: string;
    description: string;
    price: string;
    oldPrice: string;
    imageUrl: string;
    isAvailable: boolean;
    isBestSeller: boolean;
    badge: string;
};

type Props = {
    draft: MenuDraft;
    onChangeDraft: (updater: (current: MenuDraft) => MenuDraft) => void;
    categoryOptions: string[];
    isCreating: boolean;
    selectedDish: AdminDish | undefined;
    isSaving: boolean;
    inDrawer?: boolean;
    hideActions?: boolean;
    onSave: () => void;
    onImageUploadingChange: (uploading: boolean) => void;
    onDelete?: () => void;
    onDiscard: () => void;
};

export function OwnerMenuForm({
    draft,
    onChangeDraft,
    categoryOptions,
    isCreating,
    selectedDish,
    isSaving,
    inDrawer = false,
    hideActions = false,
    onSave,
    onImageUploadingChange,
    onDelete,
    onDiscard,
}: Props) {
    const { t } = useLocale();
    const uploadImage = async (file: File): Promise<void> => {
        const types = ['image/jpeg', 'image/png', 'image/webp'];
        if (!types.includes(file.type) || file.size > 2 * 1024 * 1024) {
            throw new Error('Pilih gambar JPG, PNG, atau WebP maksimal 2 MB.');
        }

        const encoded = document.cookie
            .split('; ')
            .find((value) => value.startsWith('XSRF-TOKEN='))
            ?.slice('XSRF-TOKEN='.length);
        const token = encoded ? decodeURIComponent(encoded) : undefined;
        const data = new FormData();
        data.append('image', file);
        let response: Response;
        try {
            response = await fetch('/pos/menu-images', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(token ? { 'X-XSRF-TOKEN': token } : {}),
                },
                body: data,
            });
        } catch {
            throw new Error(
                'Tidak dapat menghubungi Laravel untuk mengunggah gambar.',
            );
        }

        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
            const error =
                result && typeof result === 'object' && 'errors' in result
                    ? (result as { errors?: { image?: string[] } }).errors
                          ?.image?.[0]
                    : undefined;
            throw new Error(
                error ??
                    (response.status === 403
                        ? 'Hanya Owner aktif yang dapat mengunggah gambar.'
                        : response.status === 419 || response.status === 401
                          ? 'Sesi berakhir. Silakan login ulang.'
                          : 'Upload gambar gagal. Silakan coba lagi.'),
            );
        }

        const url =
            result && typeof result === 'object' && 'image_url' in result
                ? (result as { image_url?: unknown }).image_url
                : null;
        if (
            typeof url !== 'string' ||
            !/^\/storage\/menu\/[A-Za-z0-9._/-]+$/.test(url)
        ) {
            throw new Error('URL gambar dari Laravel tidak valid.');
        }
        onChangeDraft((current) => ({ ...current, imageUrl: url }));
    };
    const previewLabel =
        draft.badge ||
        (draft.isBestSeller
            ? t('ownerMenu.bestSeller')
            : t('ownerMenu.livePreview'));
    const preview = (
        <div className="editor-preview">
            <Image
                src={draft.imageUrl || FALLBACK_IMAGE}
                alt={draft.name || 'Menu preview'}
                width={900}
                height={600}
            />
            <span title={previewLabel}>{previewLabel}</span>
        </div>
    );

    return (
        <aside
            className={
                inDrawer
                    ? 'menu-editor-panel owner-menu-drawer-form'
                    : 'menu-editor-panel'
            }
        >
            <div className="menu-editor-head">
                <Badge color="primary">
                    {isCreating
                        ? t('ownerMenu.newItem')
                        : t('ownerMenu.editingItem')}
                </Badge>
                {!isCreating && onDelete && (
                    <IconButton
                        icon={Trash2}
                        size="small"
                        className="c2-editor-delete"
                        aria-label={t('common.delete')}
                        onClick={onDelete}
                    />
                )}
            </div>
            {!inDrawer && preview}
            {!inDrawer && (
                <div className="menu-editor-meta">
                    <article>
                        <span>{t('ownerMenu.visibility')}</span>
                        <strong>
                            {draft.isAvailable
                                ? t('ownerMenu.customerQr')
                                : t('ownerMenu.hidden')}
                        </strong>
                    </article>
                    <article>
                        <span>{t('ownerMenu.soldToday')}</span>
                        <strong>{selectedDish?.soldToday ?? 0}</strong>
                    </article>
                </div>
            )}
            <div
                className={
                    inDrawer
                        ? 'menu-add-fields'
                        : 'editor-fields c2-editor-fields'
                }
            >
                <Input
                    label={t('ownerMenu.menuName')}
                    size={inDrawer ? 'medium' : 'small'}
                    fieldClassName={
                        inDrawer ? 'menu-add-focus-field' : undefined
                    }
                    autoFocus={inDrawer}
                    isRequired
                    value={draft.name}
                    onChange={(value) =>
                        onChangeDraft((current) => ({
                            ...current,
                            name: value,
                        }))
                    }
                />
                <Select
                    label={t('ownerMenu.category')}
                    size={inDrawer ? 'md' : 'sm'}
                    className={inDrawer ? 'menu-add-select' : undefined}
                    triggerClassName={
                        inDrawer ? 'menu-add-focus-select' : undefined
                    }
                    selectedKey={draft.category}
                    onSelectionChange={(key) => {
                        if (key == null) return;
                        onChangeDraft((current) => ({
                            ...current,
                            category: String(key),
                        }));
                    }}
                >
                    {categoryOptions.map((category) => (
                        <SelectItem
                            key={category}
                            id={category}
                            textValue={category}
                        >
                            {category}
                        </SelectItem>
                    ))}
                </Select>
                <Input
                    label={t('ownerMenu.price')}
                    size={inDrawer ? 'medium' : 'small'}
                    fieldClassName={
                        inDrawer ? 'menu-add-focus-field' : undefined
                    }
                    isRequired
                    inputMode="numeric"
                    value={draft.price}
                    onChange={(value) =>
                        onChangeDraft((current) => ({
                            ...current,
                            price: value,
                        }))
                    }
                />
                <Input
                    label={t('ownerMenu.oldPrice')}
                    size={inDrawer ? 'medium' : 'small'}
                    fieldClassName={
                        inDrawer ? 'menu-add-focus-field' : undefined
                    }
                    inputMode="numeric"
                    placeholder={t('ownerMenu.optional')}
                    value={draft.oldPrice}
                    onChange={(value) =>
                        onChangeDraft((current) => ({
                            ...current,
                            oldPrice: value,
                        }))
                    }
                />
                <div className="owner-menu-image-upload">
                    <p className="text-body-medium text-text-primary">
                        {t('ownerMenu.imageUrl')}
                    </p>
                    <FileUpload
                        uploadFile={uploadImage}
                        onUploadingChange={onImageUploadingChange}
                        allowedExtensions={['jpg', 'jpeg', 'png', 'webp']}
                        maxBytes={2 * 1024 * 1024}
                    />
                </div>
                <Input
                    label={t('ownerMenu.imageUrl')}
                    size={inDrawer ? 'medium' : 'small'}
                    fieldClassName={
                        inDrawer ? 'menu-add-focus-field' : undefined
                    }
                    value={draft.imageUrl}
                    onChange={(value) =>
                        onChangeDraft((current) => ({
                            ...current,
                            imageUrl: value,
                        }))
                    }
                />
                <Textarea
                    label={t('ownerMenu.description')}
                    size={inDrawer ? 'medium' : 'small'}
                    fieldClassName={
                        inDrawer
                            ? 'menu-add-focus-field owner-menu-description-field'
                            : 'owner-menu-description-field'
                    }
                    resize="vertical"
                    value={draft.description}
                    rows={4}
                    onChange={(value) =>
                        onChangeDraft((current) => ({
                            ...current,
                            description: value,
                        }))
                    }
                />
            </div>
            {inDrawer && draft.imageUrl.trim() && preview}
            <div className={inDrawer ? 'menu-add-switches' : 'editor-switches'}>
                <Button
                    variant="secondary"
                    size="small"
                    className="c2-editor-switch"
                    type="button"
                    aria-pressed={draft.isAvailable}
                    onClick={() =>
                        onChangeDraft((current) => ({
                            ...current,
                            isAvailable: !current.isAvailable,
                        }))
                    }
                >
                    {draft.isAvailable
                        ? t('ownerMenu.available')
                        : t('ownerMenu.hidden')}
                </Button>
                <Button
                    variant="secondary"
                    size="small"
                    className="c2-editor-switch"
                    type="button"
                    aria-pressed={draft.isBestSeller}
                    onClick={() =>
                        onChangeDraft((current) => ({
                            ...current,
                            isBestSeller: !current.isBestSeller,
                            badge: !current.isBestSeller ? 'Best Seller' : '',
                        }))
                    }
                >
                    {t('ownerMenu.bestSeller')}
                </Button>
                <Button
                    variant="secondary"
                    size="small"
                    className="c2-editor-switch"
                    type="button"
                    aria-pressed={draft.badge.toLowerCase().includes('promo')}
                    onClick={() =>
                        onChangeDraft((current) => ({
                            ...current,
                            badge: current.badge.toLowerCase().includes('promo')
                                ? ''
                                : 'Promo',
                        }))
                    }
                >
                    {t('ownerMenu.promo')}
                </Button>
            </div>
            {!hideActions && (
                <div className="editor-actions c2-editor-actions">
                    <Button
                        variant="secondary"
                        type="button"
                        onClick={onDiscard}
                    >
                        {t('common.discard')}
                    </Button>
                    <Button
                        variant="primary"
                        type="button"
                        disabled={isSaving}
                        onClick={() => onSave()}
                    >
                        {isSaving
                            ? t('common.saving')
                            : t('ownerMenu.saveMenu')}
                    </Button>
                </div>
            )}
        </aside>
    );
}

export type { MenuDraft };

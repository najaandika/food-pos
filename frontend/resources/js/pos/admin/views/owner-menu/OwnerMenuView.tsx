import { useEffect, useMemo, useState } from 'react';
import { RiAddLine } from '@remixicon/react';
import { Button } from '../../../../../../components/base/buttons/button';
import {
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
} from '../../../../../../components/base/drawer/drawer';

import { AdminTitle, dishes as fallbackDishes } from '../..';
import { ConfirmModal } from '../../ConfirmModal';
import type { AdminDish } from '../../runtime-data';
import { OwnerMenuForm, type MenuDraft } from './OwnerMenuForm';
import {
    draftFromDish,
    emptyDraft,
    filterMenuDishes,
    getMenuCategories,
    getMenuFilterTabs,
    payloadFromDraft,
    type MenuFormPayload,
    type MenuStatusFilter,
} from './owner-menu-model';
import { OwnerMenuList } from './OwnerMenuList';
import { useLocale } from '../../i18n-context';

// R8.30A: scope new availability wording to this KPI. The frozen 501-key
// shared dictionaries are historical contracts and must remain unchanged.
const inactiveMenuKpiCopy = {
    id: { label: 'Nonaktif', hint: 'Menu yang tidak ditampilkan' },
    en: { label: 'Inactive', hint: 'Items hidden from the menu' },
} as const;

export function OwnerMenuView({
    dishes = fallbackDishes,
    onToggleAvailability,
    onCreateMenu,
    onUpdateMenu,
    onDeleteMenu,
    serverCategories,
    serverBusy = false,
    serverError,
    serverNotice,
    onRetry,
}: {
    dishes?: AdminDish[];
    serverCategories?: string[];
    serverBusy?: boolean;
    serverError?: string;
    serverNotice?: string;
    onRetry?: () => void;
    onToggleAvailability?: (
        dishId: number | undefined,
        isAvailable: boolean | undefined,
    ) => Promise<void> | void;
    onCreateMenu?: (payload: MenuFormPayload) => Promise<number | void> | void;
    onUpdateMenu?: (
        dishId: number | undefined,
        payload: MenuFormPayload,
    ) => Promise<void> | void;
    onDeleteMenu?: (dishId: number | undefined) => Promise<void> | void;
}) {
    const { t, locale } = useLocale();
    const [activeCategory, setActiveCategory] = useState('All');
    const [statusFilter, setStatusFilter] = useState<MenuStatusFilter>('all');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<number | undefined>(
        dishes[0]?.id,
    );
    const [isCreating, setIsCreating] = useState(false);
    const [draft, setDraft] = useState<MenuDraft>(() =>
        draftFromDish(dishes[0]),
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isImageUploading, setIsImageUploading] = useState(false);
    const [createError, setCreateError] = useState('');
    const [dishToDelete, setDishToDelete] = useState<AdminDish | null>(null);

    const activeCount = useMemo(
        () => dishes.filter((dish) => dish.isAvailable !== false).length,
        [dishes],
    );
    const archivedCount = useMemo(
        () => dishes.filter((dish) => dish.isAvailable === false).length,
        [dishes],
    );

    const visibleDishes = useMemo(
        () => filterMenuDishes(dishes, activeCategory, statusFilter, query),
        [activeCategory, dishes, query, statusFilter],
    );

    const selectedDish = useMemo(
        () =>
            visibleDishes.find((dish) => dish.id === selectedId) ??
            visibleDishes[0] ??
            dishes.find((dish) => dish.id === selectedId) ??
            dishes[0],
        [visibleDishes, dishes, selectedId],
    );

    useEffect(() => {
        if (isCreating) return;
        const nextDish =
            visibleDishes.find((dish) => dish.id === selectedId) ??
            visibleDishes[0] ??
            dishes[0];
        setSelectedId(nextDish?.id);
        setDraft(draftFromDish(nextDish));
    }, [visibleDishes, dishes, selectedId, isCreating]);

    const categoryOptions = useMemo(
        () => getMenuCategories(dishes, serverCategories),
        [dishes, serverCategories],
    );

    const filterTabs = useMemo(
        () => getMenuFilterTabs(categoryOptions, serverCategories),
        [categoryOptions, serverCategories],
    );

    const menuStats = useMemo(
        () => [
            {
                id: 'active',
                label: t('ownerMenu.activeItems'),
                value: String(activeCount),
                hint: `${archivedCount} ${t('ownerMenu.hiddenToday')}`,
                active: statusFilter === 'active',
                clickable: true,
            },
            {
                id: 'bestsellers',
                label: t('ownerMenu.bestSellers'),
                value: String(
                    dishes.filter((dish) => dish.isBestSeller || dish.badge)
                        .length,
                ),
                hint: t('ownerMenu.shownInQr'),
                active: false,
                clickable: false,
            },
            {
                id: 'archived',
                label: inactiveMenuKpiCopy[locale].label,
                value: String(archivedCount),
                hint: inactiveMenuKpiCopy[locale].hint,
                active: statusFilter === 'archived',
                clickable: true,
            },
        ],
        [activeCount, archivedCount, dishes, locale, statusFilter, t],
    );

    const handleStatClick = (statId: string) => {
        if (statId === 'active') {
            setStatusFilter((prev) => (prev === 'active' ? 'all' : 'active'));
        } else if (statId === 'archived') {
            setStatusFilter((prev) =>
                prev === 'archived' ? 'all' : 'archived',
            );
        }
    };

    const startCreate = () => {
        if (isImageUploading) return;
        setCreateError('');
        setIsCreating(true);
        setSelectedId(undefined);
        setDraft({
            ...emptyDraft,
            category: categoryOptions[0] ?? 'Coffee',
        });
    };

    const closeCreate = () => {
        if (isSaving || serverBusy || isImageUploading) return;
        setIsCreating(false);
        setCreateError('');
        setDraft(draftFromDish(selectedDish));
    };

    const startEdit = (dish: AdminDish) => {
        if (isImageUploading) return;
        setIsCreating(false);
        setSelectedId(dish.id);
        setDraft(draftFromDish(dish));
    };

    const duplicateDish = async (dish: AdminDish) => {
        const payload = payloadFromDraft({
            ...draftFromDish(dish),
            name: `${dish.name} Copy`,
        });
        try {
            const createdId = await onCreateMenu?.(payload);
            if (typeof createdId === 'number') {
                setSelectedId(createdId);
                setIsCreating(false);
            }
        } catch {
            // The live server error is displayed above the catalog.
        }
    };

    const saveMenu = async () => {
        if (isImageUploading || isSaving || serverBusy) return;
        const payload = payloadFromDraft(draft);
        if (
            !payload.name ||
            !payload.category ||
            !Number.isFinite(payload.price) ||
            payload.price <= 0
        ) {
            if (isCreating)
                setCreateError(
                    locale === 'id'
                        ? 'Isi nama, kategori, dan harga menu yang lebih besar dari nol.'
                        : 'Enter a name, category, and menu price greater than zero.',
                );
            return;
        }
        setCreateError('');
        setIsSaving(true);
        try {
            if (isCreating) {
                const createdId = await onCreateMenu?.(payload);
                if (typeof createdId === 'number') setSelectedId(createdId);
                setIsCreating(false);
            } else {
                await onUpdateMenu?.(selectedDish?.id, payload);
            }
        } catch (reason) {
            // Preserve the draft while the Drawer shows the Laravel error.
            if (isCreating)
                setCreateError(
                    reason instanceof Error
                        ? reason.message
                        : locale === 'id'
                          ? 'Gagal menyimpan menu.'
                          : 'Could not save menu.',
                );
        } finally {
            setIsSaving(false);
        }
    };

    const requestDeleteMenu = (dish = selectedDish) => {
        if (!dish?.id) return;
        setDishToDelete(dish);
    };

    const confirmDeleteMenu = async () => {
        if (!dishToDelete?.id) return;
        const dishId = dishToDelete.id;
        setDishToDelete(null);
        try {
            await onDeleteMenu?.(dishId);
        } catch {
            // Show the backend conflict/error in the page alert.
        }
    };

    return (
        <section className="app-view active owner-menu-c2-page">
            <header className="topbar">
                <AdminTitle
                    title={t('ownerMenu.title')}
                    subtitle={t('ownerMenu.subtitle')}
                />
                <Button
                    variant="primary"
                    leadingIcon={RiAddLine}
                    className="pos-boardui-add-button"
                    type="button"
                    onClick={startCreate}
                    disabled={serverBusy || isImageUploading}
                >
                    {t('ownerMenu.addNew')}
                </Button>
            </header>

            {serverError && (
                <div className="owner-menu-server-feedback" role="alert">
                    <span>{serverError}</span>
                    {onRetry && (
                        <Button
                            variant="secondary"
                            size="small"
                            type="button"
                            onClick={onRetry}
                        >
                            Muat ulang
                        </Button>
                    )}
                </div>
            )}
            {!serverError && serverNotice && (
                <div className="owner-menu-server-feedback" role="status">
                    {serverNotice}
                </div>
            )}

            <div
                className={
                    isCreating
                        ? 'owner-menu-layout owner-menu-creating'
                        : 'owner-menu-layout'
                }
            >
                <OwnerMenuList
                    dishes={dishes}
                    visibleDishes={visibleDishes}
                    menuStats={menuStats}
                    statusFilter={statusFilter}
                    activeCount={activeCount}
                    archivedCount={archivedCount}
                    filterTabs={filterTabs}
                    activeCategory={activeCategory}
                    query={query}
                    selectedId={selectedId}
                    isCreating={isCreating}
                    selectedDish={selectedDish}
                    onChangeStatus={setStatusFilter}
                    onChangeCategory={setActiveCategory}
                    onChangeQuery={setQuery}
                    onStatClick={handleStatClick}
                    onStartEdit={startEdit}
                    onDuplicate={duplicateDish}
                    onToggleAvailability={onToggleAvailability}
                    onDelete={requestDeleteMenu}
                />
                {!isCreating && (
                    <OwnerMenuForm
                        draft={draft}
                        onChangeDraft={setDraft}
                        categoryOptions={categoryOptions}
                        isCreating={isCreating}
                        selectedDish={selectedDish}
                        isSaving={isSaving || serverBusy || isImageUploading}
                        onImageUploadingChange={setIsImageUploading}
                        onSave={saveMenu}
                        onDelete={() => requestDeleteMenu()}
                        onDiscard={() => setDraft(draftFromDish(selectedDish))}
                    />
                )}
            </div>

            <Drawer
                placement="end"
                size="md"
                className="owner-menu-add-drawer"
                overlayClassName="owner-menu-add-overlay"
                isOpen={isCreating}
                isDismissable={!isSaving && !serverBusy && !isImageUploading}
                isKeyboardDismissDisabled={
                    isSaving || serverBusy || isImageUploading
                }
                onOpenChange={(open) => {
                    if (!open) closeCreate();
                }}
            >
                <DrawerHeader
                    title={t('ownerMenu.addNew')}
                    description={
                        locale === 'id'
                            ? 'Isi informasi menu. Menu baru tersedia setelah disimpan.'
                            : 'Enter the menu details. The new item becomes available after saving.'
                    }
                    closeLabel={t('common.close')}
                />
                <DrawerBody className="owner-menu-add-body">
                    <OwnerMenuForm
                        draft={draft}
                        onChangeDraft={setDraft}
                        categoryOptions={categoryOptions}
                        isCreating
                        inDrawer
                        hideActions
                        selectedDish={undefined}
                        isSaving={isSaving || serverBusy || isImageUploading}
                        onImageUploadingChange={setIsImageUploading}
                        onSave={saveMenu}
                        onDiscard={closeCreate}
                    />
                    {(createError || serverError) && (
                        <p
                            className="owner-menu-add-error text-body-2-regular"
                            role="alert"
                        >
                            {createError || serverError}
                        </p>
                    )}
                </DrawerBody>
                <DrawerFooter className="owner-menu-add-footer">
                    <Button
                        variant="secondary"
                        type="button"
                        disabled={isSaving || serverBusy || isImageUploading}
                        onClick={closeCreate}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="primary"
                        type="button"
                        disabled={isSaving || serverBusy || isImageUploading}
                        onClick={() => void saveMenu()}
                    >
                        {isSaving || serverBusy
                            ? t('common.saving')
                            : t('ownerMenu.saveMenu')}
                    </Button>
                </DrawerFooter>
            </Drawer>

            <ConfirmModal
                isOpen={Boolean(dishToDelete)}
                title={t('ownerMenu.deleteTitle')}
                message={t('ownerMenu.deleteConfirm')}
                targetName={dishToDelete?.name}
                targetDetails={
                    dishToDelete
                        ? `${dishToDelete.category ?? 'Coffee'} • ${dishToDelete.price}`
                        : undefined
                }
                confirmLabel={t('ownerMenu.deleteConfirmAction')}
                cancelLabel={t('common.cancel')}
                isDanger={true}
                onConfirm={confirmDeleteMenu}
                onCancel={() => setDishToDelete(null)}
            />
        </section>
    );
}

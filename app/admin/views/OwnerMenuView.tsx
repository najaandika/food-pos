'use client';

import { useEffect, useMemo, useState } from 'react';

import { AdminTitle, dishes as fallbackDishes } from '..';
import { ConfirmModal } from '../ConfirmModal';
import type { AdminDish } from '../runtime-data';
import { OwnerMenuForm, type MenuDraft } from './owner-menu/OwnerMenuForm';
import { OwnerMenuList } from './owner-menu/OwnerMenuList';
import { useLocale } from '../i18n-context';

const DEFAULT_CATEGORIES = ['Coffee', 'Non Coffee', 'Food', 'Snack', 'Signature', 'Breakfast', 'Promo'];
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80';

type MenuFormPayload = {
  name: string;
  category: string;
  description: string;
  price: number;
  oldPrice: number | null;
  imageUrl: string;
  isAvailable: boolean;
  isBestSeller: boolean;
  badge: string | null;
};

const emptyDraft: MenuDraft = {
  name: '',
  category: 'Coffee',
  description: '',
  price: '',
  oldPrice: '',
  imageUrl: FALLBACK_IMAGE,
  isAvailable: true,
  isBestSeller: false,
  badge: '',
};

const currencyToNumber = (value?: string) => Number(String(value ?? '').replace(/[^\d.]/g, '')) || 0;

function draftFromDish(dish?: AdminDish): MenuDraft {
  if (!dish) return emptyDraft;
  return {
    name: dish.name,
    category: dish.category ?? 'Coffee',
    description: dish.desc,
    price: String(dish.rawPrice ?? currencyToNumber(dish.price)),
    oldPrice: dish.rawOldPrice ? String(dish.rawOldPrice) : '',
    imageUrl: dish.image || FALLBACK_IMAGE,
    isAvailable: dish.isAvailable !== false,
    isBestSeller: Boolean(dish.isBestSeller || dish.badge === 'Best Seller' || dish.badge === 'Popular'),
    badge: dish.badge ?? '',
  };
}

function payloadFromDraft(draft: MenuDraft): MenuFormPayload {
  return {
    name: draft.name.trim(),
    category: draft.category.trim(),
    description: draft.description.trim(),
    price: Number(draft.price),
    oldPrice: draft.oldPrice.trim() ? Number(draft.oldPrice) : null,
    imageUrl: draft.imageUrl.trim(),
    isAvailable: draft.isAvailable,
    isBestSeller: draft.isBestSeller,
    badge: draft.badge.trim() || null,
  };
}

export function OwnerMenuView({
  dishes = fallbackDishes,
  onToggleAvailability,
  onCreateMenu,
  onUpdateMenu,
  onDeleteMenu,
}: {
  dishes?: AdminDish[];
  onToggleAvailability?: (dishId: number | undefined, isAvailable: boolean | undefined) => void;
  onCreateMenu?: (payload: MenuFormPayload) => Promise<void> | void;
  onUpdateMenu?: (dishId: number | undefined, payload: MenuFormPayload) => Promise<void> | void;
  onDeleteMenu?: (dishId: number | undefined) => Promise<void> | void;
}) {
  const { t } = useLocale();
  const [activeCategory, setActiveCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(dishes[0]?.id);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<MenuDraft>(() => draftFromDish(dishes[0]));
  const [isSaving, setIsSaving] = useState(false);
  const [dishToDelete, setDishToDelete] = useState<AdminDish | null>(null);

  const activeCount = useMemo(() => dishes.filter((dish) => dish.isAvailable !== false).length, [dishes]);
  const archivedCount = useMemo(() => dishes.filter((dish) => dish.isAvailable === false).length, [dishes]);

  const visibleDishes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return dishes.filter((dish) => {
      const matchesCategory = activeCategory === 'All' || dish.category === activeCategory;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && dish.isAvailable !== false) ||
        (statusFilter === 'archived' && dish.isAvailable === false);
      const matchesQuery =
        !normalizedQuery ||
        dish.name.toLowerCase().includes(normalizedQuery) ||
        dish.desc.toLowerCase().includes(normalizedQuery) ||
        dish.category?.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesStatus && matchesQuery;
    });
  }, [activeCategory, dishes, query, statusFilter]);

  const selectedDish = useMemo(
    () => visibleDishes.find((dish) => dish.id === selectedId) ?? visibleDishes[0] ?? dishes.find((dish) => dish.id === selectedId) ?? dishes[0],
    [visibleDishes, dishes, selectedId],
  );

  useEffect(() => {
    if (isCreating) return;
    const nextDish = visibleDishes.find((dish) => dish.id === selectedId) ?? visibleDishes[0] ?? dishes[0];
    setSelectedId(nextDish?.id);
    setDraft(draftFromDish(nextDish));
  }, [visibleDishes, dishes, selectedId, isCreating]);

  const categoryOptions = useMemo(() => {
    const categories = dishes.map((dish) => dish.category).filter(Boolean) as string[];
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]));
  }, [dishes]);

  const filterTabs = useMemo(() => ['All', ...categoryOptions.filter((category) => category !== 'Non Coffee').slice(0, 4)], [categoryOptions]);

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
        value: String(dishes.filter((dish) => dish.isBestSeller || dish.badge).length),
        hint: t('ownerMenu.shownInQr'),
        active: false,
        clickable: false,
      },
      {
        id: 'archived',
        label: t('ownerMenu.outOfStock'),
        value: String(archivedCount),
        hint: t('ownerMenu.needRestock'),
        active: statusFilter === 'archived',
        clickable: true,
      },
    ],
    [activeCount, archivedCount, dishes, statusFilter, t],
  );

  const handleStatClick = (statId: string) => {
    if (statId === 'active') {
      setStatusFilter((prev) => (prev === 'active' ? 'all' : 'active'));
    } else if (statId === 'archived') {
      setStatusFilter((prev) => (prev === 'archived' ? 'all' : 'archived'));
    }
  };

  const startCreate = () => {
    setIsCreating(true);
    setSelectedId(undefined);
    setDraft(emptyDraft);
  };

  const startEdit = (dish: AdminDish) => {
    setIsCreating(false);
    setSelectedId(dish.id);
    setDraft(draftFromDish(dish));
  };

  const duplicateDish = async (dish: AdminDish) => {
    const payload = payloadFromDraft({ ...draftFromDish(dish), name: `${dish.name} Copy` });
    await onCreateMenu?.(payload);
  };

  const saveMenu = async () => {
    const payload = payloadFromDraft(draft);
    if (!payload.name || !payload.category || !Number.isFinite(payload.price) || payload.price <= 0) return;
    setIsSaving(true);
    try {
      if (isCreating) {
        await onCreateMenu?.(payload);
        setIsCreating(false);
      } else {
        await onUpdateMenu?.(selectedDish?.id, payload);
      }
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
    await onDeleteMenu?.(dishId);
  };

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title={t('ownerMenu.title')} subtitle={t('ownerMenu.subtitle')} />
        <button className="owner-primary-btn" type="button" onClick={startCreate}>
          {t('ownerMenu.addNew')}
        </button>
      </header>

      <div className="owner-menu-layout">
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
        <OwnerMenuForm
          draft={draft}
          onChangeDraft={setDraft}
          categoryOptions={categoryOptions}
          isCreating={isCreating}
          selectedDish={selectedDish}
          isSaving={isSaving}
          onSave={saveMenu}
          onDelete={() => requestDeleteMenu()}
          onDiscard={() => (isCreating ? setDraft(emptyDraft) : setDraft(draftFromDish(selectedDish)))}
        />
      </div>

      <ConfirmModal
        isOpen={Boolean(dishToDelete)}
        title={t('ownerMenu.deleteTitle')}
        message={t('ownerMenu.deleteConfirm')}
        targetName={dishToDelete?.name}
        targetDetails={dishToDelete ? `${dishToDelete.category ?? 'Coffee'} • ${dishToDelete.price}` : undefined}
        confirmLabel={t('ownerMenu.deleteConfirmAction')}
        cancelLabel={t('common.cancel')}
        isDanger={true}
        onConfirm={confirmDeleteMenu}
        onCancel={() => setDishToDelete(null)}
      />
    </section>
  );
}

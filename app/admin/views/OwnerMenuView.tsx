'use client';

import { Copy, Pencil, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AdminTitle, dishes as fallbackDishes, MockSelect } from '..';
import type { AdminDish } from '../runtime-data';

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
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(dishes[0]?.id);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<MenuDraft>(() => draftFromDish(dishes[0]));
  const [isSaving, setIsSaving] = useState(false);

  const selectedDish = useMemo(
    () => dishes.find((dish) => dish.id === selectedId) ?? dishes[0],
    [dishes, selectedId],
  );

  useEffect(() => {
    if (isCreating) return;
    const nextDish = dishes.find((dish) => dish.id === selectedId) ?? dishes[0];
    setSelectedId(nextDish?.id);
    setDraft(draftFromDish(nextDish));
  }, [dishes, selectedId, isCreating]);

  const categoryOptions = useMemo(() => {
    const categories = dishes.map((dish) => dish.category).filter(Boolean) as string[];
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]));
  }, [dishes]);

  const filterTabs = useMemo(() => ['All', ...categoryOptions.filter((category) => category !== 'Non Coffee').slice(0, 4)], [categoryOptions]);

  const visibleDishes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return dishes.filter((dish) => {
      const matchesCategory = activeCategory === 'All' || dish.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        dish.name.toLowerCase().includes(normalizedQuery) ||
        dish.desc.toLowerCase().includes(normalizedQuery) ||
        dish.category?.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, dishes, query]);

  const menuStats = useMemo(
    () => [
      {
        label: 'Active Items',
        value: String(dishes.filter((dish) => dish.isAvailable !== false).length),
        hint: `${dishes.filter((dish) => dish.isAvailable === false).length} hidden today`,
      },
      {
        label: 'Best Sellers',
        value: String(dishes.filter((dish) => dish.isBestSeller || dish.badge).length),
        hint: 'Shown in QR menu',
      },
      {
        label: 'Out of Stock',
        value: String(dishes.filter((dish) => dish.isAvailable === false).length),
        hint: 'Need restock',
      },
    ],
    [dishes],
  );

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

  const deleteMenu = async () => {
    if (!selectedDish?.id) return;
    const approved = window.confirm(`Delete ${selectedDish.name}? Items with order history will be hidden instead.`);
    if (!approved) return;
    await onDeleteMenu?.(selectedDish.id);
  };

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Menu Management" subtitle="Manage menu availability, pricing, badges, and categories." />
        <button className="owner-primary-btn" type="button" onClick={startCreate}>Add New Menu</button>
      </header>

      <div className="owner-menu-layout">
        <section className="owner-menu-main">
          <div className="owner-menu-summary">
            {menuStats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.hint}</small>
              </article>
            ))}
          </div>

          <div className="owner-menu-toolbar">
            <label className="search-wrap">
              <input type="search" placeholder="Search menu item" value={query} onChange={(event) => setQuery(event.target.value)} />
              <Search aria-hidden="true" />
            </label>
            <div className="owner-filter-tabs">
              {filterTabs.map((category) => (
                <button
                  className={activeCategory === category ? 'active' : ''}
                  type="button"
                  key={category}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="owner-menu-table">
            <div className="owner-menu-table-head">
              <span>Menu</span>
              <span>Category</span>
              <span>Price</span>
              <span>Status</span>
              <span>Flag</span>
              <span />
            </div>
            {visibleDishes.map((dish) => (
              <article className={`owner-menu-row ${dish.id === selectedDish?.id && !isCreating ? 'selected' : ''}`} key={dish.id ?? dish.name}>
                <button className="owner-menu-product" type="button" onClick={() => startEdit(dish)}>
                  <img src={dish.image || FALLBACK_IMAGE} alt={dish.name} />
                  <div><strong>{dish.name}</strong><small>{dish.desc}</small><em>{dish.soldToday ?? 0} sold today</em></div>
                </button>
                <span>{dish.category ?? 'Coffee'}</span>
                <strong>{dish.price}</strong>
                <button className={`availability-toggle ${dish.isAvailable === false ? 'off' : ''}`} type="button" onClick={() => onToggleAvailability?.(dish.id, dish.isAvailable)}>
                  <i />{dish.isAvailable === false ? 'Hidden' : 'Available'}
                </button>
                <span className={`owner-flag ${dish.badge ? 'active' : ''}`}>{dish.badge ?? 'Regular'}</span>
                <div className="owner-menu-actions">
                  <button type="button" aria-label={`Edit ${dish.name}`} onClick={() => startEdit(dish)}><Pencil aria-hidden="true" /></button>
                  <button type="button" aria-label={`Duplicate ${dish.name}`} onClick={() => void duplicateDish(dish)}><Copy aria-hidden="true" /></button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="menu-editor-panel">
          <div className="menu-editor-head">
            <span className="mini-status ready">{isCreating ? 'New Item' : 'Editing Item'}</span>
            {!isCreating && (
              <button className="editor-delete-btn" type="button" aria-label="Delete menu item" onClick={deleteMenu}>
                <Trash2 aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="editor-preview">
            <img src={draft.imageUrl || FALLBACK_IMAGE} alt={draft.name || 'Menu preview'} />
            <span>{draft.badge || (draft.isBestSeller ? 'Best Seller' : 'Live Preview')}</span>
          </div>
          <div className="menu-editor-meta">
            <article><span>Visibility</span><strong>{draft.isAvailable ? 'Customer QR' : 'Hidden'}</strong></article>
            <article><span>Sold Today</span><strong>{selectedDish?.soldToday ?? 0}</strong></article>
          </div>
          <div className="editor-fields">
            <label>
              <span>Menu Name</span>
              <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <div className="editor-field">
              <span>Category</span>
              <MockSelect value={draft.category} options={categoryOptions} onChange={(category) => setDraft((current) => ({ ...current, category }))} />
            </div>
            <label>
              <span>Price</span>
              <input inputMode="numeric" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} />
            </label>
            <label>
              <span>Old Price</span>
              <input inputMode="numeric" placeholder="Optional" value={draft.oldPrice} onChange={(event) => setDraft((current) => ({ ...current, oldPrice: event.target.value }))} />
            </label>
            <label>
              <span>Image URL</span>
              <input value={draft.imageUrl} onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))} />
            </label>
            <label>
              <span>Description</span>
              <textarea value={draft.description} rows={4} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            </label>
          </div>
          <div className="editor-switches">
            <button className={draft.isAvailable ? 'active' : ''} type="button" onClick={() => setDraft((current) => ({ ...current, isAvailable: !current.isAvailable }))}>Available</button>
            <button className={draft.isBestSeller ? 'active' : ''} type="button" onClick={() => setDraft((current) => ({ ...current, isBestSeller: !current.isBestSeller, badge: !current.isBestSeller ? 'Best Seller' : '' }))}>Best Seller</button>
            <button className={draft.badge.toLowerCase().includes('promo') ? 'active' : ''} type="button" onClick={() => setDraft((current) => ({ ...current, badge: current.badge.toLowerCase().includes('promo') ? '' : 'Promo' }))}>Promo</button>
          </div>
          <div className="editor-actions">
            <button type="button" onClick={() => (isCreating ? setDraft(emptyDraft) : setDraft(draftFromDish(selectedDish)))}>Discard</button>
            <button type="button" disabled={isSaving} onClick={() => void saveMenu()}>{isSaving ? 'Saving...' : 'Save Menu'}</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

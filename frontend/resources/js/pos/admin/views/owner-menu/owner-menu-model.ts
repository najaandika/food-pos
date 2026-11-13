import type { AdminDish } from '../../runtime-data';
import type { MenuDraft } from './OwnerMenuForm';

export const DEFAULT_CATEGORIES = [
    'Coffee',
    'Non Coffee',
    'Food',
    'Snack',
    'Signature',
    'Breakfast',
    'Promo',
];

export const FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80';

export type MenuFormPayload = {
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

export const emptyDraft: MenuDraft = {
    name: '',
    category: 'Coffee',
    description: '',
    price: '',
    oldPrice: '',
    imageUrl: '',
    isAvailable: true,
    isBestSeller: false,
    badge: '',
};

export const currencyToNumber = (value?: string) =>
    Number(String(value ?? '').replace(/[^\d.]/g, '')) || 0;

export function draftFromDish(dish?: AdminDish): MenuDraft {
    if (!dish) return emptyDraft;
    return {
        name: dish.name,
        category: dish.category ?? 'Coffee',
        description: dish.desc,
        price: String(dish.rawPrice ?? currencyToNumber(dish.price)),
        oldPrice: dish.rawOldPrice ? String(dish.rawOldPrice) : '',
        imageUrl: dish.image || FALLBACK_IMAGE,
        isAvailable: dish.isAvailable !== false,
        isBestSeller: Boolean(
            dish.isBestSeller ||
            dish.badge === 'Best Seller' ||
            dish.badge === 'Popular',
        ),
        badge: dish.badge ?? '',
    };
}

export function payloadFromDraft(draft: MenuDraft): MenuFormPayload {
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

export type MenuStatusFilter = 'all' | 'active' | 'archived';
export function filterMenuDishes(
    dishes: AdminDish[],
    activeCategory: string,
    statusFilter: MenuStatusFilter,
    query: string,
): AdminDish[] {
    const normalizedQuery = query.trim().toLowerCase();
    return dishes.filter((dish) => {
        const matchesCategory =
            activeCategory === 'All' || dish.category === activeCategory;
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
}
export function getMenuCategories(
    dishes: AdminDish[],
    serverCategories?: string[],
): string[] {
    const categories = dishes
        .map((dish) => dish.category)
        .filter(Boolean) as string[];
    return Array.from(
        new Set(
            serverCategories
                ? [...serverCategories, ...categories]
                : [...DEFAULT_CATEGORIES, ...categories],
        ),
    );
}
export function getMenuFilterTabs(
    categoryOptions: string[],
    serverCategories?: string[],
): string[] {
    return [
        'All',
        ...(serverCategories
            ? categoryOptions
            : categoryOptions
                  .filter((category) => category !== 'Non Coffee')
                  .slice(0, 4)),
    ];
}

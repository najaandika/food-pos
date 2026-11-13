import { Chip } from '../../../../../../components/base/badges/chip';
import {
    PillTab,
    PillTabList,
} from '../../../../../../components/base/tabs/pill-tab';
import type { AdminDish } from '../../runtime-data';
import { useLocale } from '../../i18n-context';

type CartLine = AdminDish & { cartQty: number };

type Props = {
    categories: string[];
    activeCategory: string;
    onSelectCategory: (category: string) => void;
    dishes: AdminDish[];
    cartLines: CartLine[];
    itemCount: number;
};

export function MenuFilterPanel({
    categories,
    activeCategory,
    onSelectCategory,
    dishes,
    cartLines,
    itemCount,
}: Props) {
    const { t } = useLocale();

    return (
        <nav
            className="category-rail menu-p2-filter-panel"
            aria-label="Kategori menu"
        >
            <div className="category-head">
                <span>{t('menu.menuMode')}</span>
                <strong>{t('menu.manualOrder')}</strong>
            </div>
            <div className="menu-p2-category-scroll">
                <PillTabList
                    className="menu-p2-category-tabs"
                    aria-label="Filter kategori produk"
                >
                    {categories.map((category) => {
                        const isAll = category === 'All Menu';
                        const categoryCount = isAll
                            ? dishes.length
                            : dishes.filter(
                                  (dish) => dish.category === category,
                              ).length;
                        const selectedCount = isAll
                            ? itemCount
                            : cartLines
                                  .filter((line) => line.category === category)
                                  .reduce(
                                      (count, line) => count + line.cartQty,
                                      0,
                                  );

                        return (
                            <PillTab
                                key={category}
                                variant="gray"
                                isSelected={activeCategory === category}
                                onSelect={() => onSelectCategory(category)}
                                className="menu-p2-category-pill"
                            >
                                <span className="menu-p2-category-name">
                                    {isAll ? t('menu.allMenu') : category}
                                </span>
                                <span className="menu-p2-category-count">
                                    {categoryCount}
                                </span>
                                {selectedCount > 0 && (
                                    <Chip
                                        color="blue"
                                        variant="caption"
                                        className="menu-p2-category-selected"
                                    >
                                        {selectedCount}
                                    </Chip>
                                )}
                            </PillTab>
                        );
                    })}
                </PillTabList>
            </div>
        </nav>
    );
}

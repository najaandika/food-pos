import { RiAddLine, RiSearchLine, RiSubtractLine } from '@remixicon/react';

import { Chip } from '../../../../../../components/base/badges/chip';
import { IconButton } from '../../../../../../components/base/buttons/icon-button';
import { MenuProductImage } from './MenuProductImage';
import type { AdminDish } from '../../runtime-data';
import { useLocale } from '../../i18n-context';

type CartLine = AdminDish & { cartQty: number };

type Props = {
    dishes: AdminDish[];
    cart: Record<string, CartLine>;
    onUpdateCart: (dish: AdminDish, change: number) => void;
};

export function MenuGrid({ dishes, cart, onUpdateCart }: Props) {
    const { t } = useLocale();

    return (
        <section
            className="menu-board menu-p2-board"
            aria-label="Katalog produk"
        >
            <div className="menu-board-head menu-p2-board-head">
                <div>
                    <span>{t('menu.serviceLane')}</span>
                    <strong>{t('menu.popularFirst')}</strong>
                </div>
                <span className="menu-p2-results" aria-live="polite">
                    {dishes.length} {t('common.items')}
                </span>
            </div>
            {dishes.length === 0 ? (
                <div className="menu-p2-empty-catalog" role="status">
                    <RiSearchLine aria-hidden="true" />
                    <strong>Produk tidak ditemukan</strong>
                    <p>Coba kata kunci lain atau pilih kategori berbeda.</p>
                </div>
            ) : (
                <div className="menu-grid menu-p2-product-grid">
                    {dishes.map((dish) => {
                        const qty = cart[String(dish.id)]?.cartQty ?? 0;
                        return (
                            <article
                                className="dish-card menu-p2-dish-card"
                                key={dish.id ?? dish.name}
                            >
                                <div className="menu-p2-image-wrap">
                                    <MenuProductImage
                                        src={dish.image}
                                        alt={dish.name}
                                    />
                                    {dish.badge && (
                                        <Chip
                                            color={
                                                dish.badgeTone === 'discount'
                                                    ? 'rose'
                                                    : 'purple'
                                            }
                                            variant="caption"
                                            className="menu-p2-product-badge"
                                            title={dish.badge}
                                        >
                                            <span className="min-w-0 truncate">
                                                {dish.badge}
                                            </span>
                                        </Chip>
                                    )}
                                </div>
                                <div className="menu-p2-dish-content">
                                    <h3>{dish.name}</h3>
                                    <p>{dish.desc}</p>
                                    <div className="dish-action-line menu-p2-product-actions">
                                        <div className="menu-p2-price">
                                            <strong>{dish.price}</strong>
                                            {dish.oldPrice && (
                                                <span className="old-price">
                                                    {dish.oldPrice}
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            className="menu-p2-quantity"
                                            aria-label={`Jumlah ${dish.name}`}
                                        >
                                            <IconButton
                                                icon={RiSubtractLine}
                                                size="small"
                                                aria-label={`Kurangi ${dish.name}`}
                                                disabled={!dish.id || qty === 0}
                                                onClick={() =>
                                                    onUpdateCart(dish, -1)
                                                }
                                            />
                                            <output
                                                aria-live="polite"
                                                aria-label={`${qty} item`}
                                            >
                                                {qty}
                                            </output>
                                            <IconButton
                                                icon={RiAddLine}
                                                size="small"
                                                aria-label={`Tambah ${dish.name}`}
                                                disabled={!dish.id}
                                                onClick={() =>
                                                    onUpdateCart(dish, 1)
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

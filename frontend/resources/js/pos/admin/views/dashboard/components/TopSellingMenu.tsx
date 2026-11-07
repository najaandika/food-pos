import { RiRestaurantLine } from '@remixicon/react';
import { Button } from '../../../../../../../components/base/buttons/button';
import type { AdminDish } from '../../../runtime-data';
import type { UserRole } from '../../../../../lib/pos-types';
import type { View } from '../../../types';
import type { useLocale } from '../../../i18n-context';

type TopSellingMenuProps = {
    hasSnapshot: boolean;
    topDishes: AdminDish[];
    topSales: number;
    maxDishSales: number;
    role: UserRole;
    onChangeView: (view: View) => void;
    localized: (id: string, en: string) => string;
    t: ReturnType<typeof useLocale>['t'];
};

export function TopSellingMenu({
    hasSnapshot,
    topDishes,
    topSales,
    maxDishSales,
    role,
    onChangeView,
    localized,
    t,
}: TopSellingMenuProps) {
    return (
        <section
            className="od-surface od-menu-card"
            aria-labelledby="od-menu-title"
        >
            <div className="od-card-topline">
                <div>
                    <span className="od-section-label">
                        {t('dashboard.popularMenu')}
                    </span>
                    <div className="od-card-heading-line">
                        <h2 id="od-menu-title">
                            {hasSnapshot ? topSales : '—'}
                        </h2>
                        <span className="od-neutral-pill">
                            {localized(
                                'porsi terjual dari 5 menu',
                                'servings across top 5 items',
                            )}
                        </span>
                    </div>
                </div>
                <RiRestaurantLine
                    className="od-header-icon"
                    aria-hidden="true"
                />
            </div>
            <div className="od-menu-plot">
                {topDishes.length ? (
                    topDishes.map((dish, index) => {
                        const sold = dish.soldToday ?? 0;
                        const share = topSales
                            ? Math.round((sold / topSales) * 100)
                            : 0;
                        return (
                            <div
                                className="od-menu-plot-row"
                                key={dish.id ?? dish.name}
                            >
                                <div className="od-menu-plot-caption">
                                    <span className="od-menu-index">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <strong title={dish.name}>
                                        {dish.name}
                                    </strong>
                                    <span
                                        className="od-menu-share"
                                        title={localized(
                                            'Bagian dari 5 menu terlaris',
                                            'Share of top 5 items',
                                        )}
                                    >
                                        {share}%
                                    </span>
                                    <span className="od-menu-sold">
                                        {sold} {localized('porsi', 'sold')}
                                    </span>
                                </div>
                                <div
                                    className="od-menu-progress-track"
                                    role="meter"
                                    aria-label={`${dish.name}: ${sold} ${localized('porsi', 'sold')}`}
                                    aria-valuemin={0}
                                    aria-valuemax={maxDishSales}
                                    aria-valuenow={sold}
                                >
                                    <span
                                        className="od-menu-progress-fill"
                                        style={{
                                            width: `${(sold / maxDishSales) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="od-empty-copy">
                        {localized(
                            'Data menu terjual belum tersedia.',
                            'Sold-item data is not available yet.',
                        )}
                    </p>
                )}
            </div>
            {topDishes.length > 0 && (
                <div className="od-menu-footnote">
                    <span className="od-chart-legend-dot" aria-hidden="true" />
                    {localized(
                        'Bar dibanding menu terlaris; persentase dari 5 menu.',
                        'Bars compare with the top item; percentages are shares of the top 5.',
                    )}
                </div>
            )}
            {role === 'owner' && (
                <Button
                    size="small"
                    variant="secondary"
                    className="od-card-footer-action"
                    onClick={() => onChangeView('owner-menu')}
                >
                    {t('dashboard.manageMenu')}
                </Button>
            )}
        </section>
    );
}

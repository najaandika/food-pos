import {
    RiFileCopyLine as Copy,
    RiPencilLine as Pencil,
    RiSearchEyeLine as SearchX,
    RiDeleteBin6Line as Trash2,
} from '@remixicon/react';
import Image from '@/pos/components/pos-image';
import { SearchField } from '../../../../../../components/base/search-field/search-field';
import { Chip } from '../../../../../../components/base/badges/chip';
import { Button } from '../../../../../../components/base/buttons/button';
import { IconButton } from '../../../../../../components/base/buttons/icon-button';
import {
    PillTab,
    PillTabList,
} from '../../../../../../components/base/tabs/pill-tab';
import {
    SegmentedControl,
    SegmentedControlItem,
} from '../../../../../../components/base/segmented-control/segmented-control';
import type { AdminDish } from '../../runtime-data';
import { useLocale } from '../../i18n-context';

const FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80';

type Props = {
    dishes: AdminDish[];
    visibleDishes: AdminDish[];
    menuStats: Array<{
        id?: string;
        label: string;
        value: string;
        hint: string;
        active?: boolean;
        clickable?: boolean;
    }>;
    statusFilter?: 'all' | 'active' | 'archived';
    activeCount?: number;
    archivedCount?: number;
    filterTabs: string[];
    activeCategory: string;
    query: string;
    selectedId: number | undefined;
    isCreating: boolean;
    selectedDish: AdminDish | undefined;
    onChangeStatus?: (status: 'all' | 'active' | 'archived') => void;
    onChangeCategory: (category: string) => void;
    onChangeQuery: (query: string) => void;
    onStatClick?: (statId: string) => void;
    onStartEdit: (dish: AdminDish) => void;
    onDuplicate: (dish: AdminDish) => void;
    onToggleAvailability?: (
        dishId: number | undefined,
        isAvailable: boolean | undefined,
    ) => void;
    onDelete?: (dish: AdminDish) => void;
};

export function OwnerMenuList({
    dishes,
    visibleDishes,
    menuStats,
    statusFilter = 'all',
    activeCount,
    archivedCount,
    filterTabs,
    activeCategory,
    query,
    isCreating,
    selectedDish,
    onChangeStatus,
    onChangeCategory,
    onChangeQuery,
    onStatClick,
    onStartEdit,
    onDuplicate,
    onToggleAvailability,
    onDelete,
}: Props) {
    const { t } = useLocale();

    const totalActive =
        activeCount ?? dishes.filter((d) => d.isAvailable !== false).length;
    const totalArchived =
        archivedCount ?? dishes.filter((d) => d.isAvailable === false).length;

    return (
        <section className="owner-menu-main">
            <div className="owner-menu-summary">
                {menuStats.map((stat) => (
                    <article
                        key={stat.label}
                        className={`${stat.clickable ? 'clickable' : ''} ${
                            stat.active
                                ? stat.id === 'archived'
                                    ? 'active-filter-danger'
                                    : 'active-filter'
                                : ''
                        }`}
                        onClick={() => stat.id && onStatClick?.(stat.id)}
                        onKeyDown={(event) => {
                            if (
                                !stat.clickable ||
                                !stat.id ||
                                (event.key !== 'Enter' && event.key !== ' ')
                            )
                                return;
                            event.preventDefault();
                            onStatClick?.(stat.id);
                        }}
                        role={stat.clickable ? 'button' : undefined}
                        tabIndex={stat.clickable ? 0 : undefined}
                    >
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                        <small>{stat.hint}</small>
                    </article>
                ))}
            </div>

            <div className="owner-menu-toolbar">
                <div className="owner-toolbar-left">
                    <SearchField
                        className="c2-owner-search"
                        shape="rounded"
                        placeholder={t('ownerMenu.searchMenu')}
                        aria-label={t('ownerMenu.searchMenu')}
                        clearLabel="Bersihkan pencarian menu"
                        value={query}
                        onChange={onChangeQuery}
                    />
                    {onChangeStatus && (
                        <SegmentedControl
                            className="c2-owner-status-tabs"
                            aria-label="Filter status menu"
                            selectedKeys={new Set([statusFilter])}
                            onSelectionChange={(keys) => {
                                const selected = Array.from(keys)[0];
                                if (
                                    selected === 'all' ||
                                    selected === 'active' ||
                                    selected === 'archived'
                                ) {
                                    onChangeStatus(selected);
                                }
                            }}
                        >
                            <SegmentedControlItem id="all">
                                {t('ownerMenu.statusAll')}
                                <span className="count-pill">
                                    {dishes.length}
                                </span>
                            </SegmentedControlItem>
                            <SegmentedControlItem id="active">
                                {t('ownerMenu.statusActive')}
                                <span className="count-pill">
                                    {totalActive}
                                </span>
                            </SegmentedControlItem>
                            <SegmentedControlItem id="archived">
                                {t('ownerMenu.statusArchived')}
                                <span className="count-pill">
                                    {totalArchived}
                                </span>
                            </SegmentedControlItem>
                        </SegmentedControl>
                    )}
                </div>
                <div className="c2-filter-scroll">
                    <PillTabList
                        className="c2-filter-tabs"
                        aria-label="Filter kategori menu"
                    >
                        {filterTabs.map((category) => (
                            <PillTab
                                variant="gray"
                                isSelected={activeCategory === category}
                                key={category}
                                onSelect={() => onChangeCategory(category)}
                            >
                                {category === 'All'
                                    ? t('common.all')
                                    : category}
                            </PillTab>
                        ))}
                    </PillTabList>
                </div>
                <span className="owner-result-count">
                    {visibleDishes.length} {t('ownerMenu.itemsFound')}
                </span>
            </div>

            <div className="owner-menu-table">
                <div className="owner-menu-table-head">
                    <span>{t('ownerMenu.tableMenu')}</span>
                    <span>{t('ownerMenu.tableCategory')}</span>
                    <span>{t('ownerMenu.tablePrice')}</span>
                    <span>{t('ownerMenu.tableStatus')}</span>
                    <span>{t('ownerMenu.tableFlag')}</span>
                    <span />
                </div>
                {visibleDishes.map((dish) => {
                    const isArchived = dish.isAvailable === false;
                    return (
                        <article
                            className={`owner-menu-row ${dish.id === selectedDish?.id && !isCreating ? 'selected' : ''} ${
                                isArchived ? 'is-archived' : ''
                            }`}
                            key={dish.id ?? dish.name}
                        >
                            <button
                                className="owner-menu-product"
                                type="button"
                                onClick={() => onStartEdit(dish)}
                            >
                                <Image
                                    src={dish.image || FALLBACK_IMAGE}
                                    alt={dish.name}
                                    width={96}
                                    height={96}
                                />
                                <div>
                                    <strong>
                                        {dish.name}
                                        {isArchived && (
                                            <span className="archived-badge">
                                                {t('ownerMenu.archivedBadge')}
                                            </span>
                                        )}
                                    </strong>
                                    <small>{dish.desc}</small>
                                    <em>
                                        {dish.soldToday ?? 0}{' '}
                                        {t('ownerMenu.soldToday')}
                                    </em>
                                </div>
                            </button>
                            <div className="owner-menu-actions">
                                {isArchived && (
                                    <Button
                                        variant="secondary"
                                        size="small"
                                        type="button"
                                        className="menu-restore-action"
                                        title={t('ownerMenu.restoreTooltip')}
                                        onClick={() =>
                                            onToggleAvailability?.(
                                                dish.id,
                                                false,
                                            )
                                        }
                                    >
                                        {t('ownerMenu.restore')}
                                    </Button>
                                )}
                                <IconButton
                                    icon={Pencil}
                                    size="small"
                                    className="c2-icon-action"
                                    aria-label={`Edit ${dish.name}`}
                                    onClick={() => onStartEdit(dish)}
                                />
                                <IconButton
                                    icon={Copy}
                                    size="small"
                                    className="c2-icon-action"
                                    aria-label={`Duplicate ${dish.name}`}
                                    onClick={() => onDuplicate(dish)}
                                />
                                {onDelete && (
                                    <IconButton
                                        icon={Trash2}
                                        size="small"
                                        className="c2-icon-action c2-danger-action"
                                        aria-label={`${t('common.delete')} ${dish.name}`}
                                        onClick={() => onDelete(dish)}
                                    />
                                )}
                            </div>
                            <div className="owner-menu-meta">
                                <span>
                                    <small>
                                        {t('ownerMenu.tableCategory')}
                                    </small>
                                    {dish.category ?? 'Coffee'}
                                </span>
                                <strong>
                                    <small>{t('ownerMenu.tablePrice')}</small>
                                    {dish.price}
                                </strong>
                                <button
                                    className={`availability-toggle menu-availability-action ${isArchived ? 'off' : ''}`}
                                    type="button"
                                    aria-pressed={!isArchived}
                                    title={
                                        isArchived
                                            ? t('ownerMenu.restoreTooltip')
                                            : t('ownerMenu.hideTooltip')
                                    }
                                    onClick={() =>
                                        onToggleAvailability?.(
                                            dish.id,
                                            dish.isAvailable,
                                        )
                                    }
                                >
                                    <Chip
                                        variant="caption"
                                        color={isArchived ? 'rose' : 'lime'}
                                        className="menu-availability-chip"
                                    >
                                        <span
                                            className="menu-availability-dot"
                                            aria-hidden="true"
                                        />
                                        {isArchived
                                            ? t('ownerMenu.hidden')
                                            : t('ownerMenu.available')}
                                    </Chip>
                                </button>
                                <Chip
                                    variant="caption"
                                    color={dish.badge ? 'blue' : 'gray'}
                                    className={`owner-flag ${dish.badge ? 'active' : ''}`}
                                >
                                    {dish.badge ?? t('ownerMenu.regular')}
                                </Chip>
                            </div>
                        </article>
                    );
                })}
                {visibleDishes.length === 0 && (
                    <div className="owner-menu-empty">
                        <span className="owner-menu-empty-icon">
                            <SearchX aria-hidden="true" />
                        </span>
                        <p>{t('ownerMenu.noItemsFound')}</p>
                        <small>{t('ownerMenu.noItemsHint')}</small>
                        {(statusFilter !== 'all' ||
                            activeCategory !== 'All' ||
                            query) && (
                            <Button
                                variant="secondary"
                                size="small"
                                type="button"
                                className="c2-reset-filter"
                                onClick={() => {
                                    onChangeStatus?.('all');
                                    onChangeCategory('All');
                                    onChangeQuery('');
                                }}
                            >
                                {t('ownerMenu.resetFilter')}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

'use client';

import { Copy, Pencil, Search, SearchX, Trash2 } from 'lucide-react';
import Image from 'next/image';
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
  onToggleAvailability?: (dishId: number | undefined, isAvailable: boolean | undefined) => void;
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
  selectedId,
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

  const totalActive = activeCount ?? dishes.filter((d) => d.isAvailable !== false).length;
  const totalArchived = archivedCount ?? dishes.filter((d) => d.isAvailable === false).length;

  return (
    <section className="owner-menu-main">
      <div className="owner-menu-summary">
        {menuStats.map((stat) => (
          <article
            key={stat.label}
            className={`${stat.clickable ? 'clickable' : ''} ${
              stat.active ? (stat.id === 'archived' ? 'active-filter-danger' : 'active-filter') : ''
            }`}
            onClick={() => stat.id && onStatClick?.(stat.id)}
            onKeyDown={(event) => {
              if (!stat.clickable || !stat.id || (event.key !== 'Enter' && event.key !== ' ')) return;
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
          <label className="admin-search-wrap">
            <input
              type="search"
              placeholder={t('ownerMenu.searchMenu')}
              value={query}
              onChange={(event) => onChangeQuery(event.target.value)}
            />
            <Search aria-hidden="true" />
          </label>
          {onChangeStatus && (
            <div className="owner-status-tabs" role="tablist" aria-label="Status filter">
              <button
                type="button"
                className={statusFilter === 'all' ? 'active' : ''}
                onClick={() => onChangeStatus('all')}
              >
                {t('ownerMenu.statusAll')}
                <span className="count-pill">{dishes.length}</span>
              </button>
              <button
                type="button"
                className={statusFilter === 'active' ? 'active' : ''}
                onClick={() => onChangeStatus('active')}
              >
                {t('ownerMenu.statusActive')}
                <span className="count-pill">{totalActive}</span>
              </button>
              <button
                type="button"
                className={`${statusFilter === 'archived' ? 'active archived' : ''}`}
                onClick={() => onChangeStatus('archived')}
              >
                {t('ownerMenu.statusArchived')}
                <span className="count-pill">{totalArchived}</span>
              </button>
            </div>
          )}
        </div>
        <div className="owner-filter-tabs">
          {filterTabs.map((category) => (
            <button
              className={activeCategory === category ? 'active' : ''}
              type="button"
              key={category}
              onClick={() => onChangeCategory(category)}
            >
              {category === 'All' ? t('common.all') : category}
            </button>
          ))}
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
              <button className="owner-menu-product" type="button" onClick={() => onStartEdit(dish)}>
                <Image src={dish.image || FALLBACK_IMAGE} alt={dish.name} width={96} height={96} />
                <div>
                  <strong>
                    {dish.name}
                    {isArchived && <span className="archived-badge">{t('ownerMenu.archivedBadge')}</span>}
                  </strong>
                  <small>{dish.desc}</small>
                  <em>
                    {dish.soldToday ?? 0} {t('ownerMenu.soldToday')}
                  </em>
                </div>
              </button>
              <div className="owner-menu-actions">
                {isArchived && (
                  <button
                    type="button"
                    className="menu-restore-action"
                    title={t('ownerMenu.restoreTooltip')}
                    onClick={() => onToggleAvailability?.(dish.id, false)}
                  >
                    {t('ownerMenu.restore')}
                  </button>
                )}
                <button type="button" aria-label={`Edit ${dish.name}`} onClick={() => onStartEdit(dish)}>
                  <Pencil aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Duplicate ${dish.name}`} onClick={() => void onDuplicate(dish)}>
                  <Copy aria-hidden="true" />
                </button>
                {onDelete && (
                  <button type="button" aria-label={`${t('common.delete')} ${dish.name}`} onClick={() => onDelete(dish)}>
                    <Trash2 aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="owner-menu-meta">
                <span><small>{t('ownerMenu.tableCategory')}</small>{dish.category ?? 'Coffee'}</span>
                <strong><small>{t('ownerMenu.tablePrice')}</small>{dish.price}</strong>
                <button
                  className={`availability-toggle ${isArchived ? 'off' : ''}`}
                  type="button"
                  title={isArchived ? t('ownerMenu.restoreTooltip') : t('ownerMenu.hideTooltip')}
                  onClick={() => onToggleAvailability?.(dish.id, dish.isAvailable)}
                >
                  <i />
                  {isArchived ? t('ownerMenu.hidden') : t('ownerMenu.available')}
                </button>
                <span className={`owner-flag ${dish.badge ? 'active' : ''}`}><small>{t('ownerMenu.tableFlag')}</small>{dish.badge ?? t('ownerMenu.regular')}</span>
              </div>
            </article>
          );
        })}
        {visibleDishes.length === 0 && (
          <div className="owner-menu-empty">
            <span className="owner-menu-empty-icon"><SearchX aria-hidden="true" /></span>
            <p>{t('ownerMenu.noItemsFound')}</p>
            <small>{t('ownerMenu.noItemsHint')}</small>
            {(statusFilter !== 'all' || activeCategory !== 'All' || query) && (
              <button
                type="button"
                className="reset-filter-btn"
                onClick={() => {
                  onChangeStatus?.('all');
                  onChangeCategory('All');
                  onChangeQuery('');
                }}
              >
                {t('ownerMenu.resetFilter')}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

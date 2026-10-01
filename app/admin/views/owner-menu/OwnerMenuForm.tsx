'use client';

import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import { MockSelect } from '../..';
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
  onSave: () => void;
  onDelete: () => void;
  onDiscard: () => void;
};

export function OwnerMenuForm({ draft, onChangeDraft, categoryOptions, isCreating, selectedDish, isSaving, onSave, onDelete, onDiscard }: Props) {
  const { t } = useLocale();

  return (
    <aside className="menu-editor-panel">
      <div className="menu-editor-head">
        <span className="mini-status ready">{isCreating ? t('ownerMenu.newItem') : t('ownerMenu.editingItem')}</span>
        {!isCreating && (
          <button className="editor-delete-btn" type="button" aria-label={t('common.delete')} onClick={onDelete}>
            <Trash2 aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="editor-preview">
        <Image src={draft.imageUrl || FALLBACK_IMAGE} alt={draft.name || 'Menu preview'} width={900} height={600} />
        <span>{draft.badge || (draft.isBestSeller ? t('ownerMenu.bestSeller') : t('ownerMenu.livePreview'))}</span>
      </div>
      <div className="menu-editor-meta">
        <article>
          <span>{t('ownerMenu.visibility')}</span>
          <strong>{draft.isAvailable ? t('ownerMenu.customerQr') : t('ownerMenu.hidden')}</strong>
        </article>
        <article>
          <span>{t('ownerMenu.soldToday')}</span>
          <strong>{selectedDish?.soldToday ?? 0}</strong>
        </article>
      </div>
      <div className="editor-fields">
        <label>
          <span>{t('ownerMenu.menuName')}</span>
          <input value={draft.name} onChange={(event) => onChangeDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <div className="editor-field">
          <span>{t('ownerMenu.category')}</span>
          <MockSelect value={draft.category} options={categoryOptions} onChange={(category) => onChangeDraft((current) => ({ ...current, category }))} />
        </div>
        <label>
          <span>{t('ownerMenu.price')}</span>
          <input
            inputMode="numeric"
            value={draft.price}
            onChange={(event) => onChangeDraft((current) => ({ ...current, price: event.target.value }))}
          />
        </label>
        <label>
          <span>{t('ownerMenu.oldPrice')}</span>
          <input
            inputMode="numeric"
            placeholder={t('ownerMenu.optional')}
            value={draft.oldPrice}
            onChange={(event) => onChangeDraft((current) => ({ ...current, oldPrice: event.target.value }))}
          />
        </label>
        <label>
          <span>{t('ownerMenu.imageUrl')}</span>
          <input value={draft.imageUrl} onChange={(event) => onChangeDraft((current) => ({ ...current, imageUrl: event.target.value }))} />
        </label>
        <label>
          <span>{t('ownerMenu.description')}</span>
          <textarea value={draft.description} rows={4} onChange={(event) => onChangeDraft((current) => ({ ...current, description: event.target.value }))} />
        </label>
      </div>
      <div className="editor-switches">
        <button
          className={draft.isAvailable ? 'active' : 'inactive-status'}
          type="button"
          onClick={() => onChangeDraft((current) => ({ ...current, isAvailable: !current.isAvailable }))}
        >
          {draft.isAvailable ? t('ownerMenu.available') : t('ownerMenu.hidden')}
        </button>
        <button
          className={draft.isBestSeller ? 'active' : ''}
          type="button"
          onClick={() => onChangeDraft((current) => ({ ...current, isBestSeller: !current.isBestSeller, badge: !current.isBestSeller ? 'Best Seller' : '' }))}
        >
          {t('ownerMenu.bestSeller')}
        </button>
        <button
          className={draft.badge.toLowerCase().includes('promo') ? 'active' : ''}
          type="button"
          onClick={() => onChangeDraft((current) => ({ ...current, badge: current.badge.toLowerCase().includes('promo') ? '' : 'Promo' }))}
        >
          {t('ownerMenu.promo')}
        </button>
      </div>
      <div className="editor-actions">
        <button type="button" onClick={onDiscard}>
          {t('common.discard')}
        </button>
        <button type="button" disabled={isSaving} onClick={() => void onSave()}>
          {isSaving ? t('common.saving') : t('ownerMenu.saveMenu')}
        </button>
      </div>
    </aside>
  );
}

export type { MenuDraft };

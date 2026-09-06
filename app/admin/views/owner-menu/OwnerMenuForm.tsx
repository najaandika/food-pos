'use client';

import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import { MockSelect } from '../..';
import type { AdminDish } from '../../runtime-data';

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
  return (
    <aside className="menu-editor-panel">
      <div className="menu-editor-head">
        <span className="mini-status ready">{isCreating ? 'New Item' : 'Editing Item'}</span>
        {!isCreating && (
          <button className="editor-delete-btn" type="button" aria-label="Delete menu item" onClick={onDelete}>
            <Trash2 aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="editor-preview">
        <Image src={draft.imageUrl || FALLBACK_IMAGE} alt={draft.name || 'Menu preview'} width={900} height={600} />
        <span>{draft.badge || (draft.isBestSeller ? 'Best Seller' : 'Live Preview')}</span>
      </div>
      <div className="menu-editor-meta">
        <article>
          <span>Visibility</span>
          <strong>{draft.isAvailable ? 'Customer QR' : 'Hidden'}</strong>
        </article>
        <article>
          <span>Sold Today</span>
          <strong>{selectedDish?.soldToday ?? 0}</strong>
        </article>
      </div>
      <div className="editor-fields">
        <label>
          <span>Menu Name</span>
          <input value={draft.name} onChange={(event) => onChangeDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <div className="editor-field">
          <span>Category</span>
          <MockSelect value={draft.category} options={categoryOptions} onChange={(category) => onChangeDraft((current) => ({ ...current, category }))} />
        </div>
        <label>
          <span>Price</span>
          <input
            inputMode="numeric"
            value={draft.price}
            onChange={(event) => onChangeDraft((current) => ({ ...current, price: event.target.value }))}
          />
        </label>
        <label>
          <span>Old Price</span>
          <input
            inputMode="numeric"
            placeholder="Optional"
            value={draft.oldPrice}
            onChange={(event) => onChangeDraft((current) => ({ ...current, oldPrice: event.target.value }))}
          />
        </label>
        <label>
          <span>Image URL</span>
          <input value={draft.imageUrl} onChange={(event) => onChangeDraft((current) => ({ ...current, imageUrl: event.target.value }))} />
        </label>
        <label>
          <span>Description</span>
          <textarea value={draft.description} rows={4} onChange={(event) => onChangeDraft((current) => ({ ...current, description: event.target.value }))} />
        </label>
      </div>
      <div className="editor-switches">
        <button className={draft.isAvailable ? 'active' : ''} type="button" onClick={() => onChangeDraft((current) => ({ ...current, isAvailable: !current.isAvailable }))}>
          Available
        </button>
        <button
          className={draft.isBestSeller ? 'active' : ''}
          type="button"
          onClick={() => onChangeDraft((current) => ({ ...current, isBestSeller: !current.isBestSeller, badge: !current.isBestSeller ? 'Best Seller' : '' }))}
        >
          Best Seller
        </button>
        <button
          className={draft.badge.toLowerCase().includes('promo') ? 'active' : ''}
          type="button"
          onClick={() => onChangeDraft((current) => ({ ...current, badge: current.badge.toLowerCase().includes('promo') ? '' : 'Promo' }))}
        >
          Promo
        </button>
      </div>
      <div className="editor-actions">
        <button type="button" onClick={onDiscard}>
          Discard
        </button>
        <button type="button" disabled={isSaving} onClick={() => void onSave()}>
          {isSaving ? 'Saving...' : 'Save Menu'}
        </button>
      </div>
    </aside>
  );
}

export type { MenuDraft };

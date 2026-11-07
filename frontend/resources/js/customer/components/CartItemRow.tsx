import { RiRestaurant2Line } from '@remixicon/react';
import { Input } from '../../../../components/base/input/input';
import { NumberField } from '../../../../components/base/number-field/number-field';
import type { CustomerCartItem } from './types';

type CartItemRowProps = {
    item: CustomerCartItem;
    formattedPrice: string;
    onNoteChange: (note: string) => void;
    onQuantityChange: (quantity: number) => void;
    notePlaceholder?: string;
};

export function CartItemRow({
    item,
    formattedPrice,
    onNoteChange,
    onQuantityChange,
    notePlaceholder = 'Item note, e.g. less sugar',
}: CartItemRowProps) {
    return (
        <article className="border-border-button-default bg-background-primary-default grid grid-cols-[72px_minmax(0,1fr)] gap-4 rounded-2xl border p-4 sm:grid-cols-[88px_minmax(0,1fr)_128px] sm:items-center">
            {item.image ? (
                <img
                    className="size-[72px] rounded-xl object-cover sm:size-[88px]"
                    src={item.image}
                    alt={item.name}
                    width={160}
                    height={160}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <div className="bg-background-secondary-default text-foreground-icon-tertiary flex size-[72px] items-center justify-center rounded-xl sm:size-[88px]">
                    <RiRestaurant2Line className="size-6" aria-hidden />
                </div>
            )}
            <div className="flex min-w-0 flex-col gap-2">
                <div>
                    <h3 className="text-headline-semibold text-text-primary truncate">
                        {item.name}
                    </h3>
                    <span className="text-body-medium text-text-secondary tabular-nums">
                        {formattedPrice}
                    </span>
                </div>
                <Input
                    fieldClassName="customer-input-focus"
                    id={`item-note-${item.id}`}
                    name={`itemNote-${item.id}`}
                    size="small"
                    aria-label={notePlaceholder}
                    value={item.note}
                    onChange={onNoteChange}
                    placeholder={notePlaceholder}
                />
            </div>
            <NumberField
                className="col-start-2 w-32 sm:col-start-3 sm:row-start-1"
                fieldClassName="customer-input-focus"
                aria-label={`Jumlah ${item.name}`}
                value={item.quantity}
                minValue={0}
                maxValue={20}
                onChange={onQuantityChange}
            />
        </article>
    );
}

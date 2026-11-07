import { RiAddLine, RiRestaurant2Line } from '@remixicon/react';
import { Chip } from '../../../../components/base/badges/chip';
import { Button } from '../../../../components/base/buttons/button';
import { NumberField } from '../../../../components/base/number-field/number-field';
import type { CustomerMenuItem } from './types';

type MenuCardProps = {
    item: CustomerMenuItem;
    quantity: number;
    formattedPrice: string;
    onAdd: () => void;
    onRemove: () => void;
    addLabel?: string;
};

export function MenuCard({
    item,
    quantity,
    formattedPrice,
    onAdd,
    onRemove,
    addLabel = 'Add',
}: MenuCardProps) {
    return (
        <article className="group border-border-button-default bg-background-primary-default hover:border-border-button-hover flex h-full flex-col overflow-hidden rounded-3xl border shadow-xs transition-[border-color,box-shadow] duration-150 hover:shadow-md">
            <div className="bg-background-secondary-default relative aspect-[16/10] overflow-hidden">
                {item.image ? (
                    <img
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        src={item.image}
                        alt={item.name}
                        width={600}
                        height={400}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="text-foreground-icon-tertiary flex size-full flex-col items-center justify-center gap-2">
                        <RiRestaurant2Line className="size-8" aria-hidden />
                        <span className="text-caption-1-medium text-text-tertiary">
                            Foto belum tersedia
                        </span>
                    </div>
                )}
                {item.badge ? (
                    <Chip
                        className="absolute top-3 left-3 shadow-xs"
                        color="yellow"
                        variant="caption"
                    >
                        {item.badge}
                    </Chip>
                ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex flex-col gap-1">
                    <span className="text-caption-1-medium text-text-tertiary">
                        {item.category}
                    </span>
                    <h2 className="text-title-3-semibold text-text-primary">
                        {item.name}
                    </h2>
                    <p className="text-body-regular text-text-secondary line-clamp-2 min-h-10">
                        {item.description || 'Menu pilihan yang siap dipesan.'}
                    </p>
                </div>
                <div className="mt-auto flex items-end justify-between gap-4">
                    <strong className="text-headline-semibold text-text-primary tabular-nums">
                        {formattedPrice}
                    </strong>
                    {quantity > 0 ? (
                        <NumberField
                            className="w-32"
                            fieldClassName="customer-input-focus"
                            aria-label={`Jumlah ${item.name}`}
                            value={quantity}
                            minValue={0}
                            maxValue={20}
                            onChange={(next) => {
                                if (next > quantity) onAdd();
                                if (next < quantity) onRemove();
                            }}
                        />
                    ) : (
                        <Button
                            size="small"
                            leadingIcon={RiAddLine}
                            onClick={onAdd}
                        >
                            {addLabel}
                        </Button>
                    )}
                </div>
            </div>
        </article>
    );
}

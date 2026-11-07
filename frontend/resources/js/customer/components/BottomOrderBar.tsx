import { RiShoppingBag3Line } from '@remixicon/react';
import { Button } from '../../../../components/base/buttons/button';

type BottomOrderBarProps = {
    itemCount: number;
    total: string;
    onReview: () => void;
    itemCountLabel?: string;
    reviewLabel?: string;
};

export function BottomOrderBar({
    itemCount,
    total,
    onReview,
    itemCountLabel = 'items',
    reviewLabel = 'Review',
}: BottomOrderBarProps) {
    return (
        <div className="border-separator-border bg-background-primary-default/95 fixed inset-x-0 bottom-0 z-30 border-t p-3 backdrop-blur sm:p-4">
            <div className="mx-auto flex max-w-7xl items-center gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="bg-background-secondary-default text-foreground-icon-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                        <RiShoppingBag3Line className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <p className="text-caption-1-medium text-text-secondary">
                            {itemCount} {itemCountLabel}
                        </p>
                        <strong className="text-headline-semibold text-text-primary block truncate tabular-nums">
                            {total}
                        </strong>
                    </div>
                </div>
                <Button className="min-w-28" onClick={onReview}>
                    {reviewLabel}
                </Button>
            </div>
        </div>
    );
}

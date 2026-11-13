'use client';

import { useState } from 'react';
import { RiRestaurant2Line } from '@remixicon/react';

type CustomerItemImageProps = {
    src: string | null | undefined;
    alt: string;
    placement: 'catalog' | 'cart';
};

/**
 * Customer catalog/cart images share one failure-safe fallback.
 * Track the failed URL, not a boolean, so an updated URL can load normally.
 */
export function CustomerItemImage({
    src,
    alt,
    placement,
}: CustomerItemImageProps) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const showImage = Boolean(src) && src !== failedSrc;

    if (showImage) {
        return (
            <img
                className={
                    placement === 'catalog'
                        ? 'size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]'
                        : 'size-[72px] rounded-xl object-cover sm:size-[88px]'
                }
                src={src ?? undefined}
                alt={alt}
                width={placement === 'catalog' ? 600 : 160}
                height={placement === 'catalog' ? 400 : 160}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setFailedSrc(src ?? null)}
            />
        );
    }

    return (
        <div
            role="img"
            aria-label={alt}
            className={
                placement === 'catalog'
                    ? 'text-foreground-icon-tertiary flex size-full flex-col items-center justify-center gap-2'
                    : 'bg-background-secondary-default text-foreground-icon-tertiary flex size-[72px] items-center justify-center rounded-xl sm:size-[88px]'
            }
        >
            <RiRestaurant2Line
                className={placement === 'catalog' ? 'size-8' : 'size-6'}
                aria-hidden
            />
            {placement === 'catalog' && (
                <span className="text-caption-1-medium text-text-tertiary">
                    Foto belum tersedia
                </span>
            )}
        </div>
    );
}

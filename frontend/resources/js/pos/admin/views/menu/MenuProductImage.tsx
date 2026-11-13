import { useState } from 'react';
import { RiRestaurant2Line } from '@remixicon/react';

import Image from '@/pos/components/pos-image';

type MenuProductImageProps = {
    src: string;
    alt: string;
};

/**
 * Feature-local image fallback for Menu POS. Track the failed source so
 * a new image URL can retry without changing the shared PosImage adapter.
 */
export function MenuProductImage({ src, alt }: MenuProductImageProps) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    if (src && src !== failedSrc) {
        return (
            <Image
                src={src}
                alt={alt}
                width={600}
                height={400}
                onError={() => setFailedSrc(src)}
            />
        );
    }

    return (
        <div
            role="img"
            aria-label={alt}
            className="text-foreground-icon-tertiary flex size-full flex-col items-center justify-center gap-2"
        >
            <RiRestaurant2Line className="size-7" aria-hidden />
            <span className="text-caption-1-medium text-text-primary text-center">
                Foto belum tersedia
            </span>
        </div>
    );
}

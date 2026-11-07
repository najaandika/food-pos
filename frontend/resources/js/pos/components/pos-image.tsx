import type { CSSProperties, ImgHTMLAttributes } from 'react';

type PosImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    src: string;
    fill?: boolean;
    priority?: boolean;
};

/** Browser image equivalent for the UI that used next/image in the old project. */
export default function PosImage({
    src,
    alt = '',
    fill = false,
    priority = false,
    loading,
    style,
    ...props
}: PosImageProps) {
    const imageStyle: CSSProperties = fill
        ? {
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              ...style,
          }
        : (style ?? {});

    return (
        <img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : (loading ?? 'lazy')}
            decoding="async"
            style={imageStyle}
            {...props}
        />
    );
}

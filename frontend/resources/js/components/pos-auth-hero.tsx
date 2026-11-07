import { useEffect, useState } from 'react';
import { cx } from '../../../utils/cx';
import diningImage from '../pages/auth/assets/hero-dining.jpg';
import kitchenImage from '../pages/auth/assets/hero-kitchen.jpg';
import checkoutImage from '../pages/auth/assets/hero-checkout.jpg';

const slides = [
    {
        image: diningImage,
        alt: 'Ruang makan restoran modern yang tertata dengan rapi',
        label: 'Ruang makan',
        title: 'Layanan yang terasa lebih terarah.',
        description:
            'Kelola kebutuhan restoran dalam satu ruang kerja yang sederhana.',
        position: 'center 54%',
        fullPosition: 'center 48%',
    },
    {
        image: kitchenImage,
        alt: 'Koki menata hidangan sebelum disajikan kepada tamu',
        label: 'Dapur',
        title: 'Dari pesanan hingga tersaji.',
        description:
            'Jaga alur kerja tim tetap jelas, bahkan di jam paling sibuk.',
        position: 'center 51%',
        fullPosition: '54% center',
    },
    {
        image: checkoutImage,
        alt: 'Staf restoran menggunakan perangkat point of sale di area operasional',
        label: 'Kasir',
        title: 'Setiap transaksi, lebih praktis.',
        description:
            'Selesaikan pembayaran dengan tenang dan kembali fokus ke tamu.',
        position: 'center 47%',
        fullPosition: '62% center',
    },
] as const;

export default function LoginHero({
    fullBleed = false,
}: {
    fullBleed?: boolean;
}) {
    const [activeSlide, setActiveSlide] = useState(0);
    const [paused, setPaused] = useState(false);
    const [decoded, setDecoded] = useState<boolean[]>([true, false, false]);
    const [requestedSlide, setRequestedSlide] = useState<number | null>(null);
    const current = slides[activeSlide];

    useEffect(() => {
        // Decode ahead so switching slides never reveals an empty frame.
        let mounted = true;
        slides.forEach((slide, index) => {
            const image = new Image();
            image.src = slide.image;
            void image
                .decode()
                .then(() => {
                    if (!mounted) return;
                    setDecoded((previous) => {
                        if (previous[index]) return previous;
                        const next = [...previous];
                        next[index] = true;
                        return next;
                    });
                })
                .catch(() => {});
        });
        return () => {
            mounted = false;
        };
    }, []);

    const selectSlide = (index: number) => {
        if (index === activeSlide) return;
        if (decoded[index]) {
            setActiveSlide(index);
            setRequestedSlide(null);
        } else {
            setRequestedSlide(index);
        }
    };

    useEffect(() => {
        if (requestedSlide !== null && decoded[requestedSlide]) {
            setActiveSlide(requestedSlide);
            setRequestedSlide(null);
        }
    }, [decoded, requestedSlide]);

    useEffect(() => {
        if (
            paused ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }
        const timer = window.setInterval(() => {
            selectSlide((activeSlide + 1) % slides.length);
        }, 7000);
        return () => window.clearInterval(timer);
    }, [paused, activeSlide, decoded]);

    const images = (
        <div className="pos-auth-photo relative mt-8 overflow-hidden rounded-xl">
            {slides.map((slide, index) => (
                <img
                    key={slide.image}
                    src={slide.image}
                    alt={slide.alt}
                    aria-hidden={index !== activeSlide}
                    style={{
                        objectPosition: fullBleed
                            ? slide.fullPosition
                            : slide.position,
                    }}
                    className={cx(
                        'pos-auth-slide-image absolute inset-0 size-full object-cover',
                        index === activeSlide ? 'opacity-100' : 'opacity-0',
                    )}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    onLoad={(event) => {
                        const image = event.currentTarget;
                        void image
                            .decode()
                            .catch(() => {})
                            .then(() => {
                                setDecoded((previous) => {
                                    if (previous[index]) return previous;
                                    const next = [...previous];
                                    next[index] = true;
                                    return next;
                                });
                            });
                    }}
                />
            ))}
        </div>
    );

    return (
        <section
            aria-label="Sekilas tentang Food POS"
            className={cx(
                'pos-auth-story hidden min-h-dvh min-w-0 flex-col px-10 py-9 lg:flex xl:px-14 xl:py-11',
                fullBleed && 'pos-auth-story--full',
            )}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setPaused(false);
                }
            }}
        >
            {fullBleed && images}
            <div className="pos-auth-brand text-title-3-semibold text-text-primary">
                Food POS<span className="text-accent-600">.</span>
            </div>

            <div className="pos-auth-story-content flex min-h-0 w-full flex-1 flex-col justify-center py-9">
                <div
                    className="pos-auth-slide-copy"
                    key={activeSlide}
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {!fullBleed && (
                        <p className="text-caption-1-medium text-text-tertiary mb-3">
                            {current.label}
                        </p>
                    )}
                    <h2 className="text-display-4-semibold text-text-primary max-w-[570px]">
                        {current.title}
                    </h2>
                    <p className="text-body-regular text-text-secondary mt-3 max-w-[430px]">
                        {current.description}
                    </p>
                </div>

                {!fullBleed && images}
            </div>

            <nav
                aria-label="Navigasi gambar hero"
                className="pos-auth-hero-nav flex items-center justify-between gap-6"
            >
                <p
                    className="text-caption-1-medium text-text-tertiary"
                    aria-hidden="true"
                >
                    <span className="text-text-primary">
                        {String(activeSlide + 1).padStart(2, '0')}
                    </span>
                    {' / '}
                    {String(slides.length).padStart(2, '0')}
                </p>
                <div className="flex items-center gap-1">
                    {slides.map((slide, index) => (
                        <button
                            type="button"
                            key={slide.image}
                            aria-label={`Tampilkan slide ${index + 1}: ${slide.label}`}
                            aria-pressed={activeSlide === index}
                            onClick={() => selectSlide(index)}
                            className="focus-visible:ring-border-focus-ring flex size-9 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        >
                            <span
                                aria-hidden="true"
                                className={cx(
                                    'h-1.5 rounded-full transition-[width,background-color] duration-200',
                                    activeSlide === index
                                        ? 'bg-accent-600 w-6'
                                        : 'bg-border-button-default w-1.5',
                                )}
                            />
                        </button>
                    ))}
                </div>
            </nav>
        </section>
    );
}

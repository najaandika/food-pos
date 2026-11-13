import {
    RiCustomerService2Line,
    RiGlobalLine,
    RiShoppingBag3Line,
} from '@remixicon/react';
import { Chip } from '../../../../components/base/badges/chip';
import { Button } from '../../../../components/base/buttons/button';
import type { CustomerLocale, CustomerTranslationKey } from '../customer-i18n';

type CustomerHeroProps = {
    tableCode: string;
    itemCount: number;
    onOpenOrder: () => void;
    cafeName?: string;
    isOrderingOpen?: boolean;
    locale?: CustomerLocale;
    onToggleLocale?: (locale: CustomerLocale) => void;
    t?: (key: CustomerTranslationKey) => string;
    onCallWaiter?: () => void;
    waiterCalled?: boolean;
};

export function CustomerHero({
    tableCode,
    itemCount,
    onOpenOrder,
    cafeName = 'POS',
    isOrderingOpen = true,
    locale = 'id',
    onToggleLocale,
    t = (key) => key,
    onCallWaiter,
    waiterCalled = false,
}: CustomerHeroProps) {
    return (
        <header className="border-border-button-default bg-background-primary-default rounded-3xl border p-5 shadow-xs sm:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex min-w-0 flex-col gap-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <Chip color="blue" variant="caption">
                            {t('table')} {tableCode.toUpperCase()}
                        </Chip>
                        <Chip
                            color={isOrderingOpen ? 'lime' : 'yellow'}
                            variant="caption"
                        >
                            {isOrderingOpen
                                ? t('openNow')
                                : t('orderingPaused')}
                        </Chip>
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="text-caption-1-semibold text-text-primary/75">
                            {locale === 'id'
                                ? 'PESAN LANGSUNG DARI MEJA'
                                : 'ORDER FROM YOUR TABLE'}
                        </p>
                        <h1 className="text-display-4-semibold text-text-primary">
                            {cafeName}
                        </h1>
                        <p className="text-body-regular text-text-secondary sm:text-headline-regular max-w-2xl">
                            {t('heroSubtitle')}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {onToggleLocale ? (
                            <Button
                                variant="secondary"
                                leadingIcon={RiGlobalLine}
                                onClick={() =>
                                    onToggleLocale(
                                        locale === 'id' ? 'en' : 'id',
                                    )
                                }
                            >
                                {locale === 'id' ? 'English' : 'Indonesia'}
                            </Button>
                        ) : null}
                        {onCallWaiter ? (
                            <Button
                                variant="secondary"
                                leadingIcon={RiCustomerService2Line}
                                onClick={onCallWaiter}
                            >
                                {waiterCalled
                                    ? t('callWaiterSent')
                                    : t('callWaiter')}
                            </Button>
                        ) : null}
                    </div>
                </div>
                <div className="bg-background-secondary-default flex shrink-0 flex-col gap-3 rounded-2xl p-4 lg:min-w-72">
                    <div className="flex items-center justify-between gap-6">
                        <span className="text-body-regular text-text-secondary">
                            {locale === 'id' ? 'Isi pesanan' : 'Order items'}
                        </span>
                        <strong className="text-title-3-semibold text-text-primary tabular-nums">
                            {itemCount}
                        </strong>
                    </div>
                    <Button
                        className="w-full"
                        leadingIcon={RiShoppingBag3Line}
                        onClick={onOpenOrder}
                        disabled={!isOrderingOpen}
                    >
                        {itemCount > 0 ? t('reviewButton') : t('orderFab')}
                    </Button>
                </div>
            </div>
        </header>
    );
}

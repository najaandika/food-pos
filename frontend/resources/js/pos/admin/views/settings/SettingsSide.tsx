import { RiBankCardLine, RiQrCodeLine, RiReceiptLine } from '@remixicon/react';
import { Switch } from '../../../../../../components/base/switch/switch';
import type { PosSettings } from '@/lib/pos-types';
import { useLocale } from '../../i18n-context';

type PaymentKey = 'cash' | 'qris' | 'transfer';
type QrKey = 'guestOrdering' | 'customerName' | 'callWaiter' | 'autoAcceptQr';

type Props = {
    settings: PosSettings;
    onTogglePayment: (key: PaymentKey) => void;
    onToggleQrOption: (key: QrKey) => void;
};

const card =
    'rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-xs sm:p-6';
const item =
    'border-separator-border flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0';

export function SettingsSide({
    settings,
    onTogglePayment,
    onToggleQrOption,
}: Props) {
    const { t } = useLocale();
    const payments: { key: PaymentKey; name: string }[] = [
        { key: 'cash', name: t('settings.cash') },
        { key: 'qris', name: 'QRIS' },
        { key: 'transfer', name: t('settings.transfer') },
    ];
    const qr: { key: QrKey; name: string }[] = [
        { key: 'guestOrdering', name: t('settings.allowGuest') },
        { key: 'customerName', name: t('settings.requireName') },
        { key: 'callWaiter', name: t('settings.enableCallWaiter') },
        { key: 'autoAcceptQr', name: t('settings.autoAcceptQr') },
    ];

    return (
        <aside className="flex min-w-0 flex-col gap-5">
            <section className={card}>
                <div className="mb-4 flex items-start gap-3">
                    <RiBankCardLine
                        className="text-foreground-icon-secondary mt-0.5 size-5 shrink-0"
                        aria-hidden="true"
                    />
                    <div>
                        <h2 className="text-headline-medium text-text-primary">
                            {t('settings.paymentMethods')}
                        </h2>
                        <p className="text-body-regular text-text-secondary mt-1">
                            {t('settings.paymentMethodsDesc')}
                        </p>
                    </div>
                </div>
                <div>
                    {payments.map(({ key, name }) => (
                        <div key={key} className={item}>
                            <span className="text-body-medium text-text-primary">
                                {name}
                            </span>
                            <Switch
                                aria-label={name}
                                size="md"
                                isSelected={settings.payments[key]}
                                onChange={() => onTogglePayment(key)}
                            />
                        </div>
                    ))}
                </div>
                <p className="text-caption-1-regular text-text-secondary mt-4">
                    {t('settings.paymentImpact')}
                </p>
            </section>

            <section className={card}>
                <div className="mb-4 flex items-start gap-3">
                    <RiQrCodeLine
                        className="text-foreground-icon-secondary mt-0.5 size-5 shrink-0"
                        aria-hidden="true"
                    />
                    <div>
                        <h2 className="text-headline-medium text-text-primary">
                            {t('settings.qrOrderingTitle')}
                        </h2>
                        <p className="text-body-regular text-text-secondary mt-1">
                            {t('settings.qrOrderingDesc')}
                        </p>
                    </div>
                </div>
                <div>
                    {qr.map(({ key, name }) => (
                        <div key={key} className={item}>
                            <span className="text-body-medium text-text-primary max-w-[210px]">
                                {name}
                            </span>
                            <Switch
                                aria-label={name}
                                size="md"
                                isSelected={settings.qrOptions[key]}
                                onChange={() => onToggleQrOption(key)}
                            />
                        </div>
                    ))}
                </div>
                <p className="text-caption-1-regular text-text-secondary mt-4">
                    {settings.qrOptions.guestOrdering
                        ? t('settings.guestOrderingOn')
                        : t('settings.guestOrderingOff')}
                </p>
            </section>

            <section className={card}>
                <div className="mb-4 flex items-start gap-3">
                    <RiReceiptLine
                        className="text-foreground-icon-secondary mt-0.5 size-5 shrink-0"
                        aria-hidden="true"
                    />
                    <div>
                        <h2 className="text-headline-medium text-text-primary">
                            {t('settings.receipt')}
                        </h2>
                        <p className="text-body-regular text-text-secondary mt-1">
                            {t('settings.receiptDesc')}
                        </p>
                    </div>
                </div>
                <div className="border-border-button-default bg-background-secondary-default rounded-xl border p-4">
                    <strong className="text-body-medium text-text-primary block">
                        {settings.profile.cafeName}
                    </strong>
                    <span className="text-caption-1-regular text-text-secondary mt-1 block">
                        {settings.profile.address}
                    </span>
                    <div className="border-separator-border text-caption-1-regular text-text-secondary mt-4 border-t pt-4">
                        {t('settings.sampleOrder')}
                    </div>
                    <p className="text-body-medium text-text-primary mt-3">
                        {t('settings.thankYou')}
                    </p>
                </div>
            </section>
        </aside>
    );
}

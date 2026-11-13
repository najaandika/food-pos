import { RiBankCardLine, RiPercentLine, RiQrCodeLine } from '@remixicon/react';
import {
    StatCards,
    type Stat,
} from '../../../../../../components/application/dashboard/stat-cards';
import { Input } from '../../../../../../components/base/input/input';
import { NumberField } from '../../../../../../components/base/number-field/number-field';
import {
    Select,
    SelectItem,
} from '../../../../../../components/base/select/select';
import { SwitchCard } from '../../../../../../components/base/switch/switch-card';
import type { PosSettings } from '@/lib/pos-types';
import { useLocale } from '../../i18n-context';

type Props = {
    settings: PosSettings;
    settingsStats: Array<{ label: string; value: string; hint: string }>;
    validationMessage: string;
    saved: boolean;
    error: string;
    onUpdateProfile: (key: keyof PosSettings['profile'], value: string) => void;
    onUpdateTax: (key: keyof PosSettings['tax'], value: string) => void;
    onUpdateHours: (
        index: number,
        key: keyof PosSettings['hours'][number],
        value: string | boolean,
    ) => void;
};

const panelClass =
    'rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-xs sm:p-6';

export function SettingsMain({
    settings,
    settingsStats,
    validationMessage,
    saved,
    error,
    onUpdateProfile,
    onUpdateTax,
    onUpdateHours,
}: Props) {
    const { t } = useLocale();
    const icons = [RiQrCodeLine, RiPercentLine, RiBankCardLine];
    const stats: Stat[] = settingsStats.map((item, index) => ({
        icon: icons[index],
        label: item.label,
        value: item.value,
        deltaColor: 'neutral',
        hint: item.hint,
    }));

    return (
        <div className="flex min-w-0 flex-col gap-5">
            <StatCards
                variant="plain"
                columns={3}
                stats={stats}
                className="max-sm:grid-cols-1!"
            />

            {validationMessage && (
                <p
                    role="alert"
                    className="text-body-regular border-border-button-default bg-background-secondary-default text-text-secondary rounded-xl border p-4"
                >
                    {validationMessage}
                </p>
            )}
            {saved && (
                <p
                    role="status"
                    className="text-body-regular border-border-button-default bg-background-secondary-default text-text-primary rounded-xl border p-4"
                >
                    {t('settings.savedNote')}
                </p>
            )}
            {error && (
                <p
                    role="alert"
                    className="text-body-regular border-border-button-default bg-background-secondary-default text-text-primary rounded-xl border p-4"
                >
                    {error}
                </p>
            )}

            <section className={panelClass}>
                <div className="mb-5">
                    <h2 className="text-headline-medium text-text-primary">
                        {t('settings.cafeProfile')}
                    </h2>
                    <p className="text-body-regular text-text-secondary mt-1">
                        {t('settings.cafeProfileDesc')}
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                        label={t('settings.cafeName')}
                        value={settings.profile.cafeName}
                        onChange={(value) => onUpdateProfile('cafeName', value)}
                        isRequired
                    />
                    <Input
                        label={t('settings.phone')}
                        type="tel"
                        value={settings.profile.phone}
                        onChange={(value) => onUpdateProfile('phone', value)}
                    />
                    <Input
                        className="sm:col-span-2"
                        label={t('settings.address')}
                        value={settings.profile.address}
                        onChange={(value) => onUpdateProfile('address', value)}
                    />
                </div>
            </section>

            <section className={panelClass}>
                <div className="mb-5">
                    <h2 className="text-headline-medium text-text-primary">
                        {t('settings.operationalHours')}
                    </h2>
                    <p className="text-body-regular text-text-secondary mt-1">
                        {t('settings.hoursDesc')}
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    {settings.hours.map((hour, index) => (
                        <div
                            key={hour.label}
                            className="border-separator-border bg-background-secondary-default flex flex-col gap-3 rounded-xl border p-4"
                        >
                            <SwitchCard
                                size="md"
                                className="[&_.truncate]:overflow-visible [&_.truncate]:text-clip [&_.truncate]:whitespace-normal"
                                title={hour.label}
                                description={
                                    hour.isOpen
                                        ? t('common.open')
                                        : t('common.closed')
                                }
                                isSelected={hour.isOpen}
                                onChange={(checked) =>
                                    onUpdateHours(index, 'isOpen', checked)
                                }
                            />
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Input
                                    label="Jam buka"
                                    type="time"
                                    value={hour.open}
                                    onChange={(value) =>
                                        onUpdateHours(index, 'open', value)
                                    }
                                    isDisabled={!hour.isOpen}
                                />
                                <Input
                                    label="Jam tutup"
                                    type="time"
                                    value={hour.close}
                                    onChange={(value) =>
                                        onUpdateHours(index, 'close', value)
                                    }
                                    isDisabled={!hour.isOpen}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className={panelClass}>
                <div className="mb-5">
                    <h2 className="text-headline-medium text-text-primary">
                        {t('settings.taxService')}
                    </h2>
                    <p className="text-body-regular text-text-secondary mt-1">
                        {t('settings.taxServiceDesc')}
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <NumberField
                        label={t('settings.tax') + ' (%)'}
                        value={settings.tax.taxRate}
                        minValue={0}
                        maxValue={100}
                        step={1}
                        onChange={(value) =>
                            onUpdateTax('taxRate', String(value))
                        }
                    />
                    <NumberField
                        label={t('settings.serviceChargeLabel') + ' (%)'}
                        value={settings.tax.serviceRate}
                        minValue={0}
                        maxValue={100}
                        step={1}
                        onChange={(value) =>
                            onUpdateTax('serviceRate', String(value))
                        }
                    />
                    <Select
                        label={t('settings.currency')}
                        selectedKey={settings.tax.currency}
                        onSelectionChange={(key) => {
                            if (key != null)
                                onUpdateTax('currency', String(key));
                        }}
                        className="w-full"
                    >
                        <SelectItem id="IDR">IDR (Rp)</SelectItem>
                        <SelectItem id="USD">USD ($)</SelectItem>
                    </Select>
                </div>
            </section>
        </div>
    );
}

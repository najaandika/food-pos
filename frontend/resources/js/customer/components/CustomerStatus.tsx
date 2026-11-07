import { Head } from '@inertiajs/react';
import { RiCheckLine, RiGlobalLine } from '@remixicon/react';
import { Chip } from '../../../../components/base/badges/chip';
import { Button } from '../../../../components/base/buttons/button';
import { cx } from '../../../../utils/cx';
import { customerTranslations, type CustomerLocale } from '../customer-i18n';

type Props = {
    tableCode: string;
    orderNumber: string;
    total: string;
    locale: CustomerLocale;
    onToggleLocale: (value: CustomerLocale) => void;
};

export function CustomerStatus({
    tableCode,
    orderNumber,
    total,
    locale,
    onToggleLocale,
}: Props) {
    const t = customerTranslations[locale];
    return (
        <main className="customer-boardui bg-background-full text-text-primary min-h-screen px-4 py-6 font-sans sm:px-6 sm:py-10">
            <Head title="Pesanan diterima - Food POS" />
            <section className="border-border-button-default bg-background-primary-default mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-3xl border p-6 text-center shadow-xs sm:p-10">
                <div className="flex w-full justify-end">
                    <Button
                        variant="secondary"
                        leadingIcon={RiGlobalLine}
                        onClick={() =>
                            onToggleLocale(locale === 'id' ? 'en' : 'id')
                        }
                    >
                        {locale === 'id' ? 'English' : 'Indonesia'}
                    </Button>
                </div>
                <div className="bg-status-lime-background text-status-lime-text flex size-16 items-center justify-center rounded-full">
                    <RiCheckLine className="size-8" aria-hidden />
                </div>
                <Chip color="blue" variant="caption">
                    {t.table} {tableCode.toUpperCase()}
                </Chip>
                <div className="flex flex-col gap-2">
                    <h1 className="text-title-1-semibold text-text-primary sm:text-display-4-semibold">
                        {t.orderReceivedTitle}
                    </h1>
                    <p className="text-body-regular text-text-secondary">
                        {locale === 'id'
                            ? 'Pesanan Anda menunggu konfirmasi staf restoran.'
                            : 'Your order is awaiting confirmation by restaurant staff.'}
                    </p>
                </div>
                <div className="bg-background-secondary-default flex w-full flex-col gap-1 rounded-2xl p-5">
                    <span className="text-caption-1-semibold text-text-tertiary">
                        {t.orderNumberLabel}
                    </span>
                    <strong className="text-title-2-semibold text-text-primary">
                        {orderNumber}
                    </strong>
                    <small className="text-body-medium text-text-secondary tabular-nums">
                        {total}
                    </small>
                </div>
                <div className="grid w-full grid-cols-3 gap-2">
                    {t.steps.map((label, index) => (
                        <div
                            className={cx(
                                'flex flex-col items-center gap-2 rounded-xl p-3 text-caption-1-medium',
                                index === 0
                                    ? 'bg-pill-tab-blue-selected-background text-accent-500'
                                    : 'bg-background-secondary-default text-text-tertiary',
                            )}
                            key={label}
                        >
                            <b className="bg-background-primary-default text-caption-1-semibold flex size-6 items-center justify-center rounded-full">
                                {index + 1}
                            </b>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
                <p
                    className="text-caption-1-regular text-text-tertiary"
                    role="status"
                >
                    {locale === 'id'
                        ? 'Pesanan sudah diterima sistem. Simpan nomor pesanan ini dan tunggu konfirmasi dari petugas restoran. Status tidak diperbarui secara langsung di halaman ini.'
                        : 'Your order was submitted. Keep the order number and wait for confirmation from restaurant staff. Live updates are not yet available on this page.'}
                </p>
            </section>
        </main>
    );
}

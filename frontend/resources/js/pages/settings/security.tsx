import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import { RiLockPasswordLine } from '@remixicon/react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import { Button } from '../../../../components/base/buttons/button';
import { Input } from '../../../../components/base/input/input';
import { edit } from '@/routes/security';
/* @chisel-passkeys */
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
/* @end-chisel-passkeys */
/* @chisel-2fa */
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
/* @end-chisel-2fa */

// oxfmt-ignore
type Props = {
    passwordRules: string;
} /* @chisel-passkeys */ & ManagePasskeysProps /* @end-chisel-passkeys */ /* @chisel-2fa */ &
    ManageTwoFactorProps; /* @end-chisel-2fa */

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Keamanan Akun" />
            <section className="border-border-button-default bg-background-primary-default rounded-3xl border p-5 shadow-xs sm:p-7">
                <div className="mb-6 flex items-start gap-3">
                    <div className="bg-background-tertiary-default text-foreground-icon-secondary flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <RiLockPasswordLine
                            className="size-5"
                            aria-hidden="true"
                        />
                    </div>
                    <div>
                        <h2 className="text-headline-medium text-text-primary">
                            Ubah kata sandi
                        </h2>
                        <p className="text-body-regular text-text-secondary mt-1">
                            Gunakan kata sandi yang kuat dan berbeda dari akun
                            lain.
                        </p>
                    </div>
                </div>
                <Form
                    {...SecurityController.update.form()}
                    options={{ preserveScroll: true }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) passwordInput.current?.focus();
                        if (errors.current_password)
                            currentPasswordInput.current?.focus();
                    }}
                    className="flex max-w-xl flex-col gap-5"
                >
                    {({ errors, processing }) => (
                        <>
                            <Input
                                ref={currentPasswordInput}
                                type="password"
                                name="current_password"
                                label="Kata sandi saat ini"
                                placeholder="Masukkan kata sandi lama"
                                autoComplete="current-password"
                                isRequired
                                isInvalid={Boolean(errors.current_password)}
                                errorMessage={errors.current_password}
                            />
                            <Input
                                ref={passwordInput}
                                type="password"
                                name="password"
                                label="Kata sandi baru"
                                placeholder="Masukkan kata sandi baru"
                                autoComplete="new-password"
                                isRequired
                                isInvalid={Boolean(errors.password)}
                                errorMessage={errors.password}
                            />
                            <Input
                                type="password"
                                name="password_confirmation"
                                label="Konfirmasi kata sandi baru"
                                placeholder="Ulangi kata sandi baru"
                                autoComplete="new-password"
                                isRequired
                                isInvalid={Boolean(
                                    errors.password_confirmation,
                                )}
                                errorMessage={errors.password_confirmation}
                            />
                            <div className="border-separator-border flex justify-end border-t pt-5">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-password-button"
                                >
                                    {processing
                                        ? 'Menyimpan…'
                                        : 'Perbarui kata sandi'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </section>

            <div className="mt-6 flex flex-col gap-6">
                {/* @chisel-2fa */}
                <section className="border-border-button-default bg-background-primary-default rounded-3xl border p-5 sm:p-7">
                    <ManageTwoFactor
                        canManageTwoFactor={props.canManageTwoFactor}
                        requiresConfirmation={props.requiresConfirmation}
                        twoFactorEnabled={props.twoFactorEnabled}
                    />
                </section>
                {/* @end-chisel-2fa */}

                {/* @chisel-passkeys */}
                <section className="border-border-button-default bg-background-primary-default rounded-3xl border p-5 sm:p-7">
                    <ManagePasskeys
                        canManagePasskeys={props.canManagePasskeys}
                        passkeys={props.passkeys}
                    />
                </section>
                {/* @end-chisel-passkeys */}
            </div>
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Security settings',
            href: edit(),
        },
    ],
};

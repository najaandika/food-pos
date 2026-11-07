import { useForm } from '@inertiajs/react';
import {
    RiEyeLine,
    RiEyeOffLine,
    RiLock2Line,
    RiMailLine,
} from '@remixicon/react';
import { useState, type FormEvent } from 'react';
import { Button } from '../../../../components/base/buttons/button';
import { Checkbox } from '../../../../components/base/checkbox/checkbox';
import { Input } from '../../../../components/base/input/input';
import { Spinner } from '../../../../components/base/spinner/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import PosAuthLink from './pos-auth-link';
import '../../../css/boardui-login.css';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const form = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            email: data.email.trim(),
        }));
        form.post(store().url, {
            preserveScroll: true,
            onSuccess: () => form.reset('password'),
        });
    };

    return (
        <>
            <div className="mb-9 flex flex-col gap-3">
                <h1 className="text-display-4-semibold text-text-primary">
                    Selamat datang kembali.
                </h1>
                <p className="text-body-regular text-text-secondary">
                    Masuk untuk melanjutkan aktivitas restoran.
                </p>
            </div>

            {status && (
                <div
                    className="bg-background-secondary-default border-border-button-default text-body-medium text-text-primary mb-6 rounded-lg border px-4 py-3"
                    role="status"
                >
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-5">
                <Input
                    name="email"
                    type="email"
                    label="Alamat email"
                    leadingIcon={RiMailLine}
                    placeholder="nama@restoran.com"
                    autoComplete="email"
                    isRequired
                    value={form.data.email}
                    onChange={(value) => form.setData('email', value)}
                    isDisabled={form.processing}
                    isInvalid={Boolean(form.errors.email)}
                    errorMessage={form.errors.email}
                    fieldClassName="pos-login-input-focus"
                />

                <Input
                    id="food-pos-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Kata sandi"
                    leadingIcon={RiLock2Line}
                    placeholder="Masukkan kata sandi"
                    autoComplete="current-password"
                    isRequired
                    value={form.data.password}
                    onChange={(value) => form.setData('password', value)}
                    isDisabled={form.processing}
                    isInvalid={Boolean(form.errors.password)}
                    errorMessage={form.errors.password}
                    fieldClassName="pos-login-input-focus py-0.5"
                    trailingAddon={
                        <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            iconOnly
                            leadingIcon={
                                showPassword ? RiEyeOffLine : RiEyeLine
                            }
                            aria-label={
                                showPassword
                                    ? 'Sembunyikan kata sandi'
                                    : 'Tampilkan kata sandi'
                            }
                            aria-controls="food-pos-password"
                            aria-pressed={showPassword}
                            disabled={form.processing}
                            className="text-foreground-icon-secondary hover:bg-background-primary-hover active:bg-background-primary-active bg-transparent focus-visible:ring-offset-0"
                            onClick={() => setShowPassword((value) => !value)}
                        />
                    }
                />

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                    <Checkbox
                        size="sm"
                        isSelected={form.data.remember}
                        onChange={(checked) =>
                            form.setData('remember', checked)
                        }
                        isDisabled={form.processing}
                    >
                        Ingat saya
                    </Checkbox>
                    {canResetPassword && (
                        <PosAuthLink href={request().url}>
                            Lupa kata sandi?
                        </PosAuthLink>
                    )}
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    size="medium"
                    disabled={form.processing}
                    aria-busy={form.processing}
                    className="mt-2 h-11 w-full justify-center"
                >
                    <span
                        className="inline-flex items-center justify-center gap-2"
                        aria-live="polite"
                    >
                        {form.processing && (
                            <Spinner
                                size="sm"
                                aria-hidden
                                className="text-background-full"
                            />
                        )}
                        {form.processing ? 'Memverifikasi akun...' : 'Masuk'}
                    </span>
                </Button>
            </form>
        </>
    );
}

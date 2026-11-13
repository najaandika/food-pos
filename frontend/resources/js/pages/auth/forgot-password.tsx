import { useForm } from '@inertiajs/react';
import { RiMailLine } from '@remixicon/react';
import type { FormEvent } from 'react';
import { Button } from '../../../../components/base/buttons/button';
import { Input } from '../../../../components/base/input/input';
import { login } from '@/routes';
import { email } from '@/routes/password';
import PosAuthLink from './pos-auth-link';
import '../../../css/boardui-login.css';

type Props = { status?: string };

export default function ForgotPassword({ status }: Props) {
    const form = useForm({ email: '' });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.transform((data) => ({ ...data, email: data.email.trim() }));
        form.post(email().url, { preserveScroll: true });
    };

    return (
        <>
            <div className="mb-9 flex flex-col gap-3">
                <h1 className="text-display-4-semibold text-text-primary">
                    Lupa kata sandi?
                </h1>
                <p className="text-body-regular text-text-secondary">
                    Masukkan alamat email akun staf. Kami akan mengirimkan
                    tautan untuk mengatur ulang kata sandi.
                </p>
            </div>

            {status && (
                <div
                    role="status"
                    className="bg-background-secondary-default border-border-button-default text-body-medium text-text-primary mb-6 rounded-lg border px-4 py-3"
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

                <Button
                    type="submit"
                    variant="primary"
                    size="medium"
                    disabled={form.processing}
                    aria-busy={form.processing}
                    data-test="email-password-reset-link-button"
                    className="mt-2 h-11 w-full justify-center"
                >
                    {form.processing
                        ? 'Mengirim tautan...'
                        : 'Kirim tautan atur ulang'}
                </Button>
            </form>

            <div className="text-body-regular text-text-secondary mt-8 flex flex-wrap items-center justify-center gap-1">
                Ingat kata sandi?
                <PosAuthLink href={login().url}>
                    Kembali ke halaman masuk
                </PosAuthLink>
            </div>
        </>
    );
}

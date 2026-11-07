import { useForm } from '@inertiajs/react';
import {
    RiEyeLine,
    RiEyeOffLine,
    RiLock2Line,
    RiMailLine,
} from '@remixicon/react';
import { useState, type FormEvent } from 'react';
import { Button } from '../../../../components/base/buttons/button';
import { Input } from '../../../../components/base/input/input';
import { login } from '@/routes';
import { update } from '@/routes/password';
import PosAuthLink from './pos-auth-link';
import '../../../css/boardui-login.css';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const form = useForm({
        token,
        email: email ?? '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(update().url, {
            preserveScroll: true,
            onSuccess: () => form.reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <div className="mb-9 flex flex-col gap-3">
                <h1 className="text-display-4-semibold text-text-primary">
                    Buat kata sandi baru.
                </h1>
                <p className="text-body-regular text-text-secondary">
                    Pilih kata sandi baru untuk akun Food POS dan konfirmasikan
                    sebelum melanjutkan.
                </p>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-5">
                <Input
                    name="email"
                    type="email"
                    label="Alamat email"
                    leadingIcon={RiMailLine}
                    autoComplete="email"
                    isReadOnly
                    value={form.data.email}
                    isInvalid={Boolean(form.errors.email)}
                    errorMessage={form.errors.email}
                    fieldClassName="pos-login-input-focus"
                />

                <Input
                    id="food-pos-new-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Kata sandi baru"
                    leadingIcon={RiLock2Line}
                    placeholder="Masukkan kata sandi baru"
                    autoComplete="new-password"
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
                                    ? 'Sembunyikan kata sandi baru'
                                    : 'Tampilkan kata sandi baru'
                            }
                            aria-controls="food-pos-new-password"
                            aria-pressed={showPassword}
                            disabled={form.processing}
                            className="text-foreground-icon-secondary hover:bg-background-primary-hover active:bg-background-primary-active bg-transparent focus-visible:ring-offset-0"
                            onClick={() => setShowPassword((value) => !value)}
                        />
                    }
                />

                <Input
                    id="food-pos-confirm-password"
                    name="password_confirmation"
                    type={showConfirmation ? 'text' : 'password'}
                    label="Konfirmasi kata sandi baru"
                    leadingIcon={RiLock2Line}
                    placeholder="Ulangi kata sandi baru"
                    autoComplete="new-password"
                    isRequired
                    value={form.data.password_confirmation}
                    onChange={(value) =>
                        form.setData('password_confirmation', value)
                    }
                    isDisabled={form.processing}
                    isInvalid={Boolean(form.errors.password_confirmation)}
                    errorMessage={form.errors.password_confirmation}
                    fieldClassName="pos-login-input-focus py-0.5"
                    trailingAddon={
                        <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            iconOnly
                            leadingIcon={
                                showConfirmation ? RiEyeOffLine : RiEyeLine
                            }
                            aria-label={
                                showConfirmation
                                    ? 'Sembunyikan konfirmasi kata sandi'
                                    : 'Tampilkan konfirmasi kata sandi'
                            }
                            aria-controls="food-pos-confirm-password"
                            aria-pressed={showConfirmation}
                            disabled={form.processing}
                            className="text-foreground-icon-secondary hover:bg-background-primary-hover active:bg-background-primary-active bg-transparent focus-visible:ring-offset-0"
                            onClick={() =>
                                setShowConfirmation((value) => !value)
                            }
                        />
                    }
                />

                <Button
                    type="submit"
                    variant="primary"
                    size="medium"
                    disabled={form.processing}
                    aria-busy={form.processing}
                    data-test="reset-password-button"
                    className="mt-2 h-11 w-full justify-center"
                >
                    {form.processing
                        ? 'Menyimpan kata sandi...'
                        : 'Simpan kata sandi baru'}
                </Button>
            </form>

            <div className="text-body-regular text-text-secondary mt-8 flex flex-wrap items-center justify-center gap-1">
                <PosAuthLink href={login().url}>Kembali ke login</PosAuthLink>
            </div>
        </>
    );
}

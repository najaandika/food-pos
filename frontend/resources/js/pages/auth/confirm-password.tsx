import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Konfirmasi kata sandi" />

            <Form {...store.form()} resetOnSuccess={['password']}>
                {({ processing, errors }) => (
                    <div className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="password">Kata sandi</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                placeholder="Masukkan kata sandi"
                                autoComplete="current-password"
                                autoFocus
                                showPasswordLabel="Tampilkan kata sandi"
                                hidePasswordLabel="Sembunyikan kata sandi"
                                disabled={processing}
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={
                                    errors.password
                                        ? 'confirm-password-error'
                                        : undefined
                                }
                            />

                            <InputError
                                id="confirm-password-error"
                                message={errors.password}
                            />
                        </div>

                        <div className="flex items-center">
                            <Button
                                className="w-full"
                                disabled={processing}
                                data-test="confirm-password-button"
                            >
                                {processing && <Spinner />}
                                {processing
                                    ? 'Mengonfirmasi...'
                                    : 'Konfirmasi kata sandi'}
                            </Button>
                        </div>
                    </div>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Konfirmasi kata sandi',
    description:
        'Untuk melanjutkan ke area terlindungi, konfirmasikan kata sandi akun Anda.',
};

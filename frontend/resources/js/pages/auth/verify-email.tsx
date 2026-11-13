// Components
import { Form, Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Verifikasi email" />

            {status === 'verification-link-sent' && (
                <div
                    role="status"
                    className="mb-4 text-center text-sm font-medium text-foreground"
                >
                    Tautan verifikasi baru telah dikirim ke alamat email akun
                    Anda.
                </div>
            )}

            <Form {...send.form()} className="space-y-6 text-center">
                {({ processing }) => (
                    <>
                        <Button disabled={processing} variant="secondary">
                            {processing && <Spinner />}
                            {processing
                                ? 'Mengirim ulang...'
                                : 'Kirim ulang email verifikasi'}
                        </Button>

                        <TextLink
                            href={logout()}
                            className="mx-auto block text-sm"
                        >
                            Keluar
                        </TextLink>
                    </>
                )}
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Verifikasi email',
    description:
        'Verifikasi alamat email dengan membuka tautan yang kami kirimkan kepada Anda.',
};

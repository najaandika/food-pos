import { Head, Link } from '@inertiajs/react';
import { login } from '@/routes';

export default function Register() {
    return (
        <>
            <Head title="Registration unavailable" />
            <div className="mx-auto max-w-md space-y-4 p-6 text-center">
                <h1 className="text-xl font-semibold">
                    Registration is unavailable
                </h1>
                <p className="text-sm text-muted-foreground">
                    New accounts are managed by the administrator.
                </p>
                <Link className="text-primary underline" href={login()}>
                    Back to sign in
                </Link>
            </div>
        </>
    );
}

Register.layout = {
    title: 'Registration unavailable',
    description: 'Please contact your administrator to request access.',
};

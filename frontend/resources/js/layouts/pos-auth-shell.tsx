import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import LoginHero from '../components/pos-auth-hero';

const authTitles: Record<string, string> = {
    'auth/login': 'Masuk ke Food POS',
    'auth/forgot-password': 'Lupa kata sandi',
    'auth/reset-password': 'Atur ulang kata sandi',
};

export default function PosAuthShell({ children }: { children: ReactNode }) {
    const { component } = usePage();
    const title = authTitles[component] ?? 'Food POS';

    return (
        <main className="pos-boardui-auth grid min-h-dvh w-full grid-cols-1 overflow-x-clip lg:grid-cols-[11fr_9fr]">
            <Head title={title} />
            <LoginHero fullBleed={component === 'auth/login'} />

            <section
                aria-label={title}
                className="pos-auth-form-panel bg-background-full flex min-h-dvh min-w-0 flex-col px-6 py-8 sm:px-10 lg:px-12 xl:px-16"
            >
                <div className="text-title-3-semibold text-text-primary lg:invisible">
                    Food POS<span className="text-accent-600">.</span>
                </div>

                <div className="pos-auth-form-content mx-auto flex w-full max-w-[404px] flex-1 flex-col justify-center py-12 lg:py-16">
                    <div data-auth-form={component} className="w-full">
                        {children}
                    </div>
                </div>

                <footer className="text-caption-2-regular text-text-tertiary mx-auto w-full max-w-[404px] text-center lg:text-start">
                    © {new Date().getFullYear()} Food POS
                </footer>
            </section>
        </main>
    );
}

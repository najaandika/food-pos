import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import PosAuthShell from '@/layouts/pos-auth-shell';

const appName = import.meta.env.VITE_APP_NAME || 'Food POS';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            case name === 'dashboard':
            case name.startsWith('customer/'):
                // Dashboard POS owns its own shell.
                return null;
            case name === 'auth/login':
            case name === 'auth/forgot-password':
            case name === 'auth/reset-password':
                // Same persistent layout across Fortify routes: no hero reset.
                return PosAuthShell;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                // Account pages share the Food POS BoardUI shell, not Laravel's default sidebar.
                return SettingsLayout;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// Clear any legacy preference and keep the product in light mode.
initializeTheme();

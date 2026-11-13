<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Establish the correct canvas before CSS/fonts/React begin rendering. --}}
        <style>
            html {
                background-color: oklch(1 0 0);
                color-scheme: light;
            }

            html.dark {
                background-color: oklch(0.145 0 0);
                color-scheme: dark;
            }
        </style>

        <script>
            (function () {
                var preference = null;
                try {
                    preference = window.localStorage.getItem('appearance');
                } catch (_) {}

                if (!['light', 'dark', 'system'].includes(preference)) {
                    var saved = document.cookie.match(/(?:^|;\s*)appearance=(light|dark|system)(?:;|$)/);
                    preference = saved ? saved[1] : null;
                }

                if (!['light', 'dark', 'system'].includes(preference)) {
                    try {
                        preference = window.localStorage.getItem('boardui:theme');
                    } catch (_) {}
                }

                if (!['light', 'dark', 'system'].includes(preference)) {
                    preference = 'system';
                }

                var dark = preference === 'dark' ||
                    (preference === 'system' && window.matchMedia &&
                        window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.classList.toggle('dark', Boolean(dark));
                document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
            })();
        </script>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>

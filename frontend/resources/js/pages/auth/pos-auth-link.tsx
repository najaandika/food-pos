import { router } from '@inertiajs/react';
import type { MouseEvent } from 'react';
import {
    LinkButton,
    type LinkButtonAnchorProps,
} from '../../../../components/base/buttons/link-button';

export default function PosAuthLink({
    href,
    onClick,
    ...props
}: LinkButtonAnchorProps) {
    const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);

        // Preserve browser shortcuts, context menus and native fallback URLs.
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.currentTarget.target === '_blank'
        ) {
            return;
        }

        event.preventDefault();
        router.visit(href, { preserveScroll: true });
    };

    return <LinkButton {...props} href={href} onClick={navigate} />;
}

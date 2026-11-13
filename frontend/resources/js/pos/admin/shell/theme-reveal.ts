/**
 * Adapted from the BoardUI theme toggle (MIT), official free repository:
 * https://github.com/BoardUI/boardui/blob/ec5c5eb3e29c2441be63b9422cd54f411ef23466/components/application/theme/theme-toggle.tsx
 *
 * MIT License — Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI)
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { flushSync } from 'react-dom';
import type {
    Appearance,
    ResolvedAppearance,
} from '../../../hooks/use-appearance';

const DURATION_MS = 820;
const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const STYLE_ID = 'pos-boardui-theme-reveal';
let transitionRunning = false;

type TransitionDocument = Document & {
    startViewTransition?: (update: () => void) => {
        ready: Promise<void>;
        finished: Promise<void>;
    };
};

function maskImage(): string {
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
        '<defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%">',
        '<feGaussianBlur stdDeviation="2" /></filter></defs>',
        '<circle cx="50" cy="50" r="42" fill="white" filter="url(#blur)" />',
        '</svg>',
    ].join('');
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

/**
 * Visual-only adapter for POS: the accepted light/dark/system hook remains
 * the single authority for state, persistence, cookies and OS theme changes.
 */
export async function revealAppearanceFromControl(
    mode: ResolvedAppearance,
    updateAppearance: (mode: Appearance) => void,
    control: HTMLElement,
    clientX = 0,
    clientY = 0,
): Promise<void> {
    if (typeof document === 'undefined' || typeof window === 'undefined')
        return;

    const root = document.documentElement;
    const isTargetDark = mode === 'dark';
    if (root.classList.contains('dark') === isTargetDark) {
        // A system-resolved theme may look identical; still save manual choice.
        updateAppearance(mode);
        return;
    }

    const doc = document as TransitionDocument;
    if (
        !doc.startViewTransition ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        transitionRunning
    ) {
        updateAppearance(mode);
        return;
    }

    const bounds = control.getBoundingClientRect();
    const keyboard = clientX === 0 && clientY === 0;
    const x = Math.min(
        Math.max(keyboard ? bounds.left + bounds.width / 2 : clientX, 0),
        window.innerWidth,
    );
    const y = Math.min(
        Math.max(keyboard ? bounds.top + bounds.height / 2 : clientY, 0),
        window.innerHeight,
    );
    const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
    );
    const finalSize = radius * 2.5;
    const mask = maskImage();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
        '::view-transition-new(root) {',
        '  -webkit-mask-image: ' + mask + '; mask-image: ' + mask + ';',
        '  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;',
        '  animation: pos-boardui-mask-reveal ' +
            DURATION_MS +
            'ms ' +
            EASING +
            ' both;',
        '  transform-origin: ' + x + 'px ' + y + 'px;',
        '  will-change: -webkit-mask-size, -webkit-mask-position, mask-size, mask-position;',
        '}',
        '@keyframes pos-boardui-mask-reveal {',
        '  from { -webkit-mask-position: ' +
            x +
            'px ' +
            y +
            'px; mask-position: ' +
            x +
            'px ' +
            y +
            'px;',
        '         -webkit-mask-size: 0 0; mask-size: 0 0; }',
        '  to { -webkit-mask-position: ' +
            (x - finalSize / 2) +
            'px ' +
            (y - finalSize / 2) +
            'px;',
        '       mask-position: ' +
            (x - finalSize / 2) +
            'px ' +
            (y - finalSize / 2) +
            'px;',
        '       -webkit-mask-size: ' + finalSize + 'px ' + finalSize + 'px;',
        '       mask-size: ' + finalSize + 'px ' + finalSize + 'px; }',
        '}',
    ].join('\n');

    transitionRunning = true;
    root.classList.add('theme-transitioning');
    document.getElementById(STYLE_ID)?.remove();
    document.head.appendChild(style);
    try {
        const transition = doc.startViewTransition(() => {
            flushSync(() => updateAppearance(mode));
        });
        await transition.ready;
        await transition.finished;
    } catch {
        // The preference must still change if the browser aborts the animation.
        if (root.classList.contains('dark') !== isTargetDark)
            updateAppearance(mode);
    } finally {
        style.remove();
        root.classList.remove('theme-transitioning');
        transitionRunning = false;
    }
}

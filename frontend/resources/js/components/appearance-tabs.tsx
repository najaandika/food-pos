import { Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-3.5 py-2 text-neutral-700',
                className,
            )}
            {...props}
        >
            <Sun className="size-4" />
            <span className="text-sm font-medium">Light mode</span>
        </div>
    );
}

'use client';

import type { ComponentType, ReactNode, Ref } from 'react';
import { Switch as AriaSwitch } from 'react-aria-components';
import type { SwitchProps as AriaSwitchProps } from 'react-aria-components';

import { cx } from '../../../utils/cx';
import { SwitchTrack } from './switch';
import type { SwitchShape, SwitchSize } from './switch';

type IconComponent = ComponentType<{
    className?: string;
    'aria-hidden'?: boolean | 'true' | 'false';
}>;

/**
 * BoardUI Switch Card: the complete card is a single, accessible React Aria
 * switch label. Reuses the existing SwitchTrack, not a nested button/switch.
 */
export interface SwitchCardProps extends Omit<AriaSwitchProps, 'children'> {
    title: ReactNode;
    description?: ReactNode;
    icon?: IconComponent;
    size?: SwitchSize;
    shape?: SwitchShape;
    ref?: Ref<HTMLLabelElement>;
}

export function SwitchCard({
    className,
    title,
    description,
    icon: Icon,
    size = 'md',
    shape = 'pill',
    ref,
    ...props
}: SwitchCardProps) {
    return (
        <AriaSwitch
            ref={ref}
            {...props}
            className={(state) =>
                cx(
                    'group flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-border-button-default py-3 pe-5 ps-4 select-none',
                    'transition-colors duration-150 ease',
                    state.isHovered && !state.isDisabled
                        ? 'bg-background-primary-hover'
                        : 'bg-background-primary-default',
                    state.isDisabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer',
                    typeof className === 'function'
                        ? className(state)
                        : className,
                )
            }
        >
            {(state) => (
                <>
                    <span className="flex min-w-0 items-center gap-3">
                        {Icon && (
                            <Icon
                                className="text-foreground-icon-secondary size-6 shrink-0"
                                aria-hidden
                            />
                        )}
                        <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-body-medium text-text-primary truncate">
                                {title}
                            </span>
                            {description != null && (
                                <span className="text-body-regular text-text-secondary truncate">
                                    {description}
                                </span>
                            )}
                        </span>
                    </span>
                    <span className="flex shrink-0 items-center">
                        <SwitchTrack state={state} size={size} shape={shape} />
                    </span>
                </>
            )}
        </AriaSwitch>
    );
}

import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './SearchField.module.css';

type SearchFieldProps = InputHTMLAttributes<HTMLInputElement> & {
    icon?: ReactNode;
    className?: string;
};

export function SearchField({
    icon,
    className,
    type = 'search',
    ...props
}: SearchFieldProps) {
    const classes = [styles.field, className].filter(Boolean).join(' ');

    return (
        <label className={classes}>
            <input type={type} {...props} />
            {icon && (
                <span className={styles.icon} aria-hidden="true">
                    {icon}
                </span>
            )}
        </label>
    );
}

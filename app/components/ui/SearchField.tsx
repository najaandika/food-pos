import type { InputHTMLAttributes, ReactNode } from 'react';

type SearchFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  className?: string;
};

export function SearchField({ icon, className, type = 'search', ...props }: SearchFieldProps) {
  const classes = ['ui-search-field', className].filter(Boolean).join(' ');

  return (
    <label className={classes}>
      <input type={type} {...props} />
      {icon && <span aria-hidden="true">{icon}</span>}
    </label>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

export function Button({ variant = 'primary', icon, className, children, type = 'button', ...props }: ButtonProps) {
  const classes = ['ui-button', `ui-button--${variant}`, className].filter(Boolean).join(' ');

  return (
    <button className={classes} type={type} {...props}>
      {icon}
      {children}
    </button>
  );
}

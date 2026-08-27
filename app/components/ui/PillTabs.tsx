type PillTabsProps<T extends string> = {
  items: readonly T[];
  value: T;
  label: string;
  onChange: (value: T) => void;
  className?: string;
};

export function PillTabs<T extends string>({ items, value, label, onChange, className }: PillTabsProps<T>) {
  const classes = ['ui-pill-tabs', className].filter(Boolean).join(' ');

  return (
    <section className={classes} aria-label={label}>
      {items.map((item) => (
        <button className={value === item ? 'active' : ''} type="button" key={item} onClick={() => onChange(item)}>
          {item}
        </button>
      ))}
    </section>
  );
}

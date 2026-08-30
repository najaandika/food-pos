import { ChevronDown } from 'lucide-react';

export function AdminTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="admin-title">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

export function MockSelect({ value, options, onChange }: { value: string; options: string[]; onChange?: (value: string) => void }) {
  return (
    <details className="custom-select">
      <summary>
        <span>{value}</span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className="custom-select-options">
        {options.map((option) => (
          <button
            className={option === value ? 'active' : ''}
            type="button"
            key={option}
            onClick={(event) => {
              onChange?.(option);
              event.currentTarget.closest('details')?.removeAttribute('open');
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </details>
  );
}

import { ChevronDown } from 'lucide-react';

export function AdminTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="admin-title">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

export function MockSelect({ value, options }: { value: string; options: string[] }) {
  return (
    <details className="custom-select">
      <summary>
        <span>{value}</span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className="custom-select-options">
        {options.map((option) => (
          <button className={option === value ? 'active' : ''} type="button" key={option}>
            {option}
          </button>
        ))}
      </div>
    </details>
  );
}

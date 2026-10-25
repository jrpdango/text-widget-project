import { classNames } from './classNames';

export interface ToggleGroupOption<T extends string> {
  value: T;
  label: string;
}

export interface ToggleGroupProps<T extends string> {
  label: string;
  value: T;
  options: readonly ToggleGroupOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

export function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: ToggleGroupProps<T>) {
  return (
    <div className={classNames('segmented-control', className)} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented-control__option"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

import type { ReactNode } from "react";

export type OptionToggleItem<T extends string | number | boolean> = {
  label: ReactNode;
  value: T;
};

type OptionToggleProps<T extends string | number | boolean> = {
  value: T;
  onChange: (value: T) => void;
  options: OptionToggleItem<T>[];
  disabled?: boolean;
  className?: string;
};

export function OptionToggle<T extends string | number | boolean>({
  value,
  onChange,
  options,
  disabled,
  className = "",
}: OptionToggleProps<T>) {
  return (
    <div
      className={`inline-flex overflow-hidden rounded border border-panel-border text-xs ${className}`.trim()}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.value)}
            className={`px-3 py-1.5 transition ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-panel text-text-secondary hover:text-foreground"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

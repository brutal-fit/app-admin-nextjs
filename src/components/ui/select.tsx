import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function Select({
  id,
  label,
  options,
  placeholder,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label?: string;
  options: SelectOption[];
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <select
        id={id}
        className={cn(
          "h-10 rounded-md border border-border-strong bg-bg px-3 text-sm text-text",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
          "disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

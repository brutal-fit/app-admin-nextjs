import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label?: string;
  hint?: string;
  error?: string | null;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "h-10 rounded-md border bg-bg px-3 text-sm text-text placeholder:text-text-subtle",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
          "disabled:opacity-50",
          error ? "border-danger" : "border-border-strong",
          className,
        )}
        {...props}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

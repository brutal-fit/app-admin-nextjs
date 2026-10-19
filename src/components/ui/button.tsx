import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  // The accent is reserved for the primary action on a screen.
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-border-strong bg-surface-raised text-text hover:border-text-muted",
  ghost: "text-text-muted hover:bg-surface-raised hover:text-text",
  danger: "border border-danger text-danger hover:bg-surface-raised",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

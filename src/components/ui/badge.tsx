import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-border-strong text-text-muted",
  success: "border-success text-success",
  warning: "border-warning text-warning",
  danger: "border-danger text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

"use client";

import { Copy } from "@/components/icons";
import { showToast } from "@/stores/toast-store";

/** An id in monospace with a button that copies it, for pasting into the Razorpay dashboard. */
export function CopyIdButton({ value, label }: { value: string; label: string }) {
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      showToast("success", `${label} copied.`);
    } catch {
      showToast("error", `Could not copy the ${label.toLowerCase()}. Select it and copy it by hand.`);
    }
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <span className="truncate font-mono text-xs">{value}</span>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label.toLowerCase()} ${value}`}
        className="focus-ring inline-flex shrink-0 items-center rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Copy size={14} aria-hidden="true" />
      </button>
    </span>
  );
}

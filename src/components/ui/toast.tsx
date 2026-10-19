"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { useToastStore, type ToastItem } from "@/stores/toast-store";

const TONE_CLASSES: Record<ToastItem["tone"], string> = {
  success: "border-success",
  error: "border-danger",
  info: "border-border-strong",
};

const DISMISS_AFTER_MS = 6000;

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((state) => state.dismiss);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [dismiss, toast.id]);
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-md border-l-4 bg-surface-raised px-4 py-3 text-sm shadow-lg",
        TONE_CLASSES[toast.tone],
      )}
    >
      <p className="flex-1 text-text">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
      >
        X
      </button>
    </li>
  );
}

/** Mounted once in the root layout; shows messages pushed with showToast(). */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  return (
    <div aria-live="polite" role="status" className="fixed right-4 bottom-4 z-50 w-80 max-w-full">
      <ul className="flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </ul>
    </div>
  );
}

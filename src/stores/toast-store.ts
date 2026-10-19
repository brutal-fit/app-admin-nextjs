import { toast } from "sonner";

export type ToastTone = "success" | "error" | "info";

/**
 * Shows a toast through sonner (the <Toaster> from src/components/ui/sonner is mounted in
 * the root layout). Kept as the single call site so features do not import sonner directly.
 */
export function showToast(tone: ToastTone, message: string): void {
  if (tone === "success") toast.success(message);
  else if (tone === "error") toast.error(message);
  else toast.info(message);
}

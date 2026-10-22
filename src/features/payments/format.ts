/*
 * Pure helpers for the payment pages: badge tones, short ids and the raw event text. No data
 * access, so the wording is testable with plain values.
 */
import type { Json, PaymentState } from "@/types/database";

/** Badge classes for a payment state (outline badges, see docs/architecture.md). */
export function paymentStateTone(state: PaymentState): string {
  switch (state) {
    case "paid":
      return "border-success text-success";
    case "created":
    case "refund_pending":
    case "refund_requested":
      return "border-warning text-warning";
    case "failed":
    case "refund_failed":
      return "border-destructive text-destructive";
    default:
      return "text-muted-foreground";
  }
}

/** The first block of a uuid, for a compact reference in tables. */
export function shortId(id: string): string {
  return id.split("-")[0] ?? id;
}

/** The stored Razorpay event as indented JSON, or null when none is stored. */
export function formatRawEvent(raw: Json | null): string | null {
  if (raw === null || raw === undefined) return null;
  return JSON.stringify(raw, null, 2);
}

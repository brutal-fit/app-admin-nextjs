/*
 * Pure helpers for the booking pages: badge tones and time ranges. No data access, so the
 * wording is testable with plain values.
 */
import type { BookingStatus, PaymentStatus } from "@/types/database";

/** Badge classes for a booking status (outline badges, see docs/architecture.md). */
export function bookingStatusTone(status: BookingStatus): string {
  switch (status) {
    case "confirmed":
    case "completed":
      return "border-success text-success";
    case "requested":
    case "pending_confirmation":
    case "reschedule_requested":
      return "border-warning text-warning";
    case "no_show":
    case "disputed":
      return "border-destructive text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export function paymentStatusTone(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return "border-success text-success";
    case "pending":
    case "authorized":
    case "refund_pending":
      return "border-warning text-warning";
    case "failed":
    case "disputed":
      return "border-destructive text-destructive";
    default:
      return "text-muted-foreground";
  }
}

const IST = "Asia/Kolkata";

/** "Mon, 20 Oct 2026, 07:00 to 08:00" in India time; the end date shows when it differs. */
export function formatSessionRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = (date: Date) =>
    date.toLocaleDateString("en-IN", {
      timeZone: IST,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const time = (date: Date) =>
    date.toLocaleTimeString("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false });
  const sameDay = day(start) === day(end);
  return sameDay
    ? `${day(start)}, ${time(start)} to ${time(end)}`
    : `${day(start)}, ${time(start)} to ${day(end)}, ${time(end)}`;
}

/*
 * Pure helpers for the subscription and coaching pages: badge tones, weekly slots, the period
 * a row is in now, and what a cancellation queued for refund. No data access, so the wording
 * is testable with plain values.
 */
import { formatInr } from "@/features/applications/format";
import { formatIsoDate } from "@/features/programmes/format";
import { missingPermissionMessage } from "@/features/users/format";
import type { CoachingStatus, PaymentState, PeriodStatus, SubscriptionStatus } from "@/types/database";

/** Badge classes for a subscription or coaching status (outline badges). */
export function subscriptionStatusTone(status: SubscriptionStatus | CoachingStatus): string {
  switch (status) {
    case "active":
      return "border-success text-success";
    case "requested":
    case "paused":
      return "border-warning text-warning";
    case "cancelled":
      return "border-destructive text-destructive";
    default:
      return "text-muted-foreground";
  }
}

/** Badge classes for a period's payment state. */
export function periodStatusTone(status: PeriodStatus): string {
  switch (status) {
    case "paid":
      return "border-success text-success";
    case "unpaid":
    case "refund_pending":
      return "border-warning text-warning";
    default:
      return "text-muted-foreground";
  }
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Weekday 1 (Monday) to 7 (Sunday) as a short name. */
export function weekdayLabel(weekday: number): string {
  return WEEKDAYS[weekday - 1] ?? `Day ${weekday}`;
}

/** Minute of the day as "07:30". */
export function formatMinuteOfDay(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** The weekly slots as "Mon 07:00, Wed 07:00, Fri 18:30", Monday first. */
export function formatSlots(slots: readonly { weekday: number; start_minute: number }[]): string {
  if (slots.length === 0) return "No slots";
  return [...slots]
    .sort((a, b) => a.weekday - b.weekday || a.start_minute - b.start_minute)
    .map((slot) => `${weekdayLabel(slot.weekday)} ${formatMinuteOfDay(slot.start_minute)}`)
    .join(", ");
}

/** "24 Oct 2026 to 20 Nov 2026" from two date columns. */
export function formatDateRange(startsOn: string, endsOn: string): string {
  return `${formatIsoDate(startsOn)} to ${formatIsoDate(endsOn)}`;
}

type PeriodLike = { id: string; seq: number; starts_on: string; ends_on: string; status: PeriodStatus; payment_id: string | null };

/**
 * The period a row is in today (India date, YYYY-MM-DD): the one covering today, else the next
 * to start, else the last one. Null without periods.
 */
export function currentPeriod<P extends PeriodLike>(periods: readonly P[], today: string): P | null {
  if (periods.length === 0) return null;
  const covering = periods.find((period) => period.starts_on <= today && today <= period.ends_on);
  if (covering) return covering;
  const upcoming = periods
    .filter((period) => period.starts_on > today)
    .sort((a, b) => a.seq - b.seq)[0];
  if (upcoming) return upcoming;
  return [...periods].sort((a, b) => b.seq - a.seq)[0] ?? null;
}

/** One refund a cancellation queued: on which period, and how much when payments are readable. */
export type QueuedRefund = {
  seq: number;
  /** Null when the session cannot read payments (payments.read). */
  amountInr: number | null;
  /** True when only part of the period's payment comes back (sessions still ahead). */
  partial: boolean;
};

/** What closing a subscription or coaching did to its periods, read back from the server. */
export type CloseOutcome =
  | { known: true; refunds: QueuedRefund[]; lapsed: number }
  | { known: false };

type PaymentLike = { id: string; amount_inr: number; refund_amount_inr: number | null; state: PaymentState };

/**
 * Compares the periods before and after the call: a paid period now refund_pending had its
 * payment queued for refund (the amount comes from that payment: refund_amount_inr when only
 * part comes back, else the whole payment); an unpaid period now lapsed was dropped.
 */
export function closeOutcome(
  before: readonly PeriodLike[],
  after: readonly PeriodLike[],
  payments: readonly PaymentLike[],
): CloseOutcome {
  const previous = new Map(before.map((period) => [period.id, period.status]));
  const byId = new Map(payments.map((payment) => [payment.id, payment]));
  const refunds: QueuedRefund[] = [];
  let lapsed = 0;
  for (const period of [...after].sort((a, b) => a.seq - b.seq)) {
    const was = previous.get(period.id);
    if (was === "paid" && period.status === "refund_pending") {
      const payment = period.payment_id ? byId.get(period.payment_id) : undefined;
      refunds.push({
        seq: period.seq,
        amountInr: payment ? (payment.refund_amount_inr ?? payment.amount_inr) : null,
        partial: payment ? payment.refund_amount_inr !== null && payment.refund_amount_inr < payment.amount_inr : false,
      });
    } else if (was === "unpaid" && period.status === "lapsed") {
      lapsed += 1;
    }
  }
  return { known: true, refunds, lapsed };
}

/** The outcome in words; `noun` is "period" for a subscription and "month" for coaching. */
export function closeOutcomeText(outcome: CloseOutcome, noun: "period" | "month"): string {
  if (!outcome.known) {
    return "Done. The page now shows what the server holds; check each period's payment for refunds.";
  }
  const parts: string[] = [];
  if (outcome.refunds.length === 0) {
    parts.push("No refund: nothing paid was left to refund.");
  } else {
    const lines = outcome.refunds.map((refund) => {
      const where = `${noun} ${refund.seq}${refund.partial ? " (sessions still ahead)" : ""}`;
      return refund.amountInr === null ? where : `${formatInr(refund.amountInr)} for ${where}`;
    });
    parts.push(`Refund queued: ${lines.join("; ")}. The refund queue sends it to Razorpay within minutes.`);
    if (outcome.refunds.some((refund) => refund.amountInr === null)) {
      parts.push(missingPermissionMessage("payments.read", "The refund amount"));
    }
  }
  if (outcome.lapsed > 0) {
    parts.push(`${outcome.lapsed} unpaid ${noun}${outcome.lapsed === 1 ? "" : "s"} lapsed.`);
  }
  return parts.join(" ");
}

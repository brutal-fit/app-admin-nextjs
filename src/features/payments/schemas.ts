import { z } from "zod";
import { PAYMENT_STATE_VALUES, type PaymentSearch } from "@/lib/db/payments";
import { isIsoDate, istDateString } from "@/lib/utils/time";
import type { PaymentState } from "@/types/database";

/** Rows per list page; the list asks for one more to know whether a next page exists. */
export const PAYMENT_PAGE_SIZE = 50;

/** The default list window: the last 30 days, today included. */
export const DEFAULT_RANGE_DAYS = 30;

/** A refund_pending payment untouched this long needs a person: the queue runs every 5 minutes. */
export const ATTENTION_AGE_MS = 60 * 60 * 1000;

/** The manual refund reason: required, 10 to 200 characters. */
export const REFUND_REASON_MIN = 10;
export const REFUND_REASON_MAX = 200;

/** Longest search text the list accepts. */
export const PAYMENT_SEARCH_MAX = 64;

export const PAYMENT_STATES = PAYMENT_STATE_VALUES;

export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  created: "Created",
  paid: "Paid",
  failed: "Failed",
  refund_pending: "Refund pending",
  refund_requested: "Refund requested",
  refunded: "Refunded",
  refund_failed: "Refund failed",
};

/**
 * States a refund by hand may start from. The `refund` function also takes refund_pending,
 * but those are the queue's: the panel leaves them to it and shows them under Needs attention
 * once stuck.
 */
export const REFUNDABLE_STATES = ["paid", "refund_failed"] as const satisfies readonly PaymentState[];

export function isRefundable(state: PaymentState): boolean {
  return (REFUNDABLE_STATES as readonly string[]).includes(state);
}

/** Why the refund button is off for this state, or null when it is on. */
export function refundBlockedReason(state: PaymentState): string | null {
  switch (state) {
    case "paid":
    case "refund_failed":
      return null;
    case "created":
      return "The client has not paid this order, so there is nothing to refund.";
    case "failed":
      return "This payment did not go through, so there is nothing to refund.";
    case "refund_pending":
      return "A refund is already queued; the refund queue sends it within minutes.";
    case "refund_requested":
      return "Razorpay is already processing a refund for this payment.";
    case "refunded":
      return "This payment is already refunded.";
  }
}

/**
 * Needs attention: a refund that failed, or a queued refund nobody has touched for an hour
 * (the queue retries every 5 minutes and marks a payment refund_failed after five refusals,
 * so a pending refund this old means the queue is not running).
 */
export function needsAttention(row: { state: PaymentState; updated_at: string }, now: number): boolean {
  if (row.state === "refund_failed") return true;
  return row.state === "refund_pending" && now - new Date(row.updated_at).getTime() > ATTENTION_AGE_MS;
}

/** List filters as they live in the URL; anything unknown is dropped, not an error. */
export type PaymentFilters = {
  state: PaymentState | null;
  attention: boolean;
  /** India-time dates, "YYYY-MM-DD", both inclusive; null when the URL has none. */
  from: string | null;
  to: string | null;
  q: string;
  page: number;
};

export const EMPTY_PAYMENT_FILTERS: PaymentFilters = {
  state: null,
  attention: false,
  from: null,
  to: null,
  q: "",
  page: 1,
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function dateOrNull(raw: string | undefined): string | null {
  return raw && isIsoDate(raw) ? raw : null;
}

export function parsePaymentFilters(params: SearchParams): PaymentFilters {
  const page = Number(first(params.page));
  const state = first(params.state);
  const attention = first(params.attention) === "yes";
  return {
    // Needs attention picks its own states, so a state filter does not apply with it.
    state: !attention && state && (PAYMENT_STATES as readonly string[]).includes(state) ? (state as PaymentState) : null,
    attention,
    from: dateOrNull(first(params.from)),
    to: dateOrNull(first(params.to)),
    q: (first(params.q) ?? "").trim().slice(0, PAYMENT_SEARCH_MAX),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/**
 * The list URL for a set of filters. Changing any filter starts again at page 1 unless the
 * page is given; picking a state turns Needs attention off and the other way round.
 */
export function paymentListHref(current: PaymentFilters, change: Partial<PaymentFilters> = {}): string {
  const next: PaymentFilters = { ...current, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.attention) params.set("attention", "yes");
  else if (next.state) params.set("state", next.state);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.q) params.set("q", next.q);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/payments?${query}` : "/payments";
}

export function hasPaymentFilters(filters: PaymentFilters): boolean {
  return Boolean(filters.state || filters.attention || filters.from || filters.to || filters.q);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The dates the list reads. Dates in the URL win; without them a search or Needs attention
 * looks at every date (an id or a stuck refund can be older than a month), and the plain list
 * shows the last 30 days.
 */
export function effectiveDateRange(filters: PaymentFilters, now: number): { from: string | null; to: string | null } {
  if (filters.from || filters.to) return { from: filters.from, to: filters.to };
  if (filters.q || filters.attention) return { from: null, to: null };
  return { from: istDateString(now - (DEFAULT_RANGE_DAYS - 1) * DAY_MS), to: istDateString(now) };
}

/** A range whose end comes before its start. */
export function invalidPaymentRange(range: { from: string | null; to: string | null }): boolean {
  return range.from !== null && range.to !== null && range.to < range.from;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVIDER_ID_PATTERN = /^[A-Za-z0-9_]+$/;
const PHONE_PATTERN = /^\+?[\d\s-]+$/;

/** What the search box holds: an id to match exactly, phone digits to resolve, or nothing valid. */
export type ParsedPaymentSearch =
  | { kind: "none" }
  | { kind: "id"; search: Exclude<PaymentSearch, { kind: "bookings" }> }
  | { kind: "phone"; digits: string }
  | { kind: "invalid"; message: string };

export const SEARCH_HINT = "Search by booking id, order id (order_...), payment id (pay_...) or the client's phone digits.";

export function parsePaymentSearch(raw: string): ParsedPaymentSearch {
  const text = raw.trim();
  if (!text) return { kind: "none" };
  if (UUID_PATTERN.test(text)) return { kind: "id", search: { kind: "uuid", value: text.toLowerCase() } };
  if (PHONE_PATTERN.test(text)) {
    const digits = text.replace(/\D/g, "");
    if (digits.length >= 4 && digits.length <= 12) return { kind: "phone", digits };
    return { kind: "invalid", message: "Give 4 to 12 digits of the phone number." };
  }
  if (PROVIDER_ID_PATTERN.test(text)) {
    if (text.startsWith("order_")) return { kind: "id", search: { kind: "order", value: text } };
    if (text.startsWith("pay_")) return { kind: "id", search: { kind: "payment", value: text } };
    return { kind: "id", search: { kind: "provider_id", value: text } };
  }
  return { kind: "invalid", message: SEARCH_HINT };
}

export const paymentIdSchema = z.guid("Unknown payment.");

export const refundReasonSchema = z
  .string()
  .trim()
  .min(REFUND_REASON_MIN, `Give a reason of at least ${REFUND_REASON_MIN} characters.`)
  .max(REFUND_REASON_MAX, `Keep the reason to ${REFUND_REASON_MAX} characters or fewer.`);

// Server action input.
export const refundPaymentSchema = z.object({
  paymentId: paymentIdSchema,
  reason: refundReasonSchema,
});
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;

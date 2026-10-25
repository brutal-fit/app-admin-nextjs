import { z } from "zod";
import { SUBSCRIPTION_PERIOD_VALUES, SUBSCRIPTION_STATUS_VALUES } from "@/lib/db/subscriptions";
import type { PeriodStatus, SubscriptionPeriodKind, SubscriptionStatus } from "@/types/database";

/** Rows per list page; the list asks for one more to know whether a next page exists. */
export const SUBSCRIPTION_PAGE_SIZE = 50;

/**
 * The reason an admin gives to cancel a subscription or end a coaching: required, 10 to 200
 * characters (the functions take up to 300 and show it to the client).
 */
export const CLOSE_REASON_MIN = 10;
export const CLOSE_REASON_MAX = 200;

export const SUBSCRIPTION_STATUSES = SUBSCRIPTION_STATUS_VALUES;
export const SUBSCRIPTION_PERIODS = SUBSCRIPTION_PERIOD_VALUES;

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  requested: "Requested",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const SUBSCRIPTION_PERIOD_LABELS: Record<SubscriptionPeriodKind, string> = {
  week: "1 week",
  month: "4 weeks",
  quarter: "12 weeks",
};

export const PERIOD_STATUSES = [
  "unpaid",
  "paid",
  "refund_pending",
  "refunded",
  "lapsed",
] as const satisfies readonly PeriodStatus[];

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  refund_pending: "Refund pending",
  refunded: "Refunded",
  lapsed: "Lapsed",
};

/** The functions refuse anything else: "This subscription has already ended." */
export const CANCELLABLE_SUBSCRIPTION_STATUSES = ["requested", "active"] as const satisfies readonly SubscriptionStatus[];

export function isSubscriptionCancellable(status: SubscriptionStatus): boolean {
  return (CANCELLABLE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}

/** List filters as they live in the URL; anything unknown is dropped, not an error. */
export type SubscriptionFilters = {
  status: SubscriptionStatus | null;
  period: SubscriptionPeriodKind | null;
  trainerId: string | null;
  page: number;
};

export const EMPTY_SUBSCRIPTION_FILTERS: SubscriptionFilters = { status: null, period: null, trainerId: null, page: 1 };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function guidOrNull(value: string | undefined): string | null {
  return value && z.guid().safeParse(value).success ? value.toLowerCase() : null;
}

export function parseSubscriptionFilters(params: SearchParams): SubscriptionFilters {
  const status = first(params.status);
  const period = first(params.period);
  const page = Number(first(params.page));
  return {
    status: status && (SUBSCRIPTION_STATUSES as readonly string[]).includes(status) ? (status as SubscriptionStatus) : null,
    period:
      period && (SUBSCRIPTION_PERIODS as readonly string[]).includes(period) ? (period as SubscriptionPeriodKind) : null,
    trainerId: guidOrNull(first(params.trainer)),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** The list URL for a set of filters; changing a filter starts again at page 1 unless given. */
export function subscriptionListHref(current: SubscriptionFilters, change: Partial<SubscriptionFilters> = {}): string {
  const next: SubscriptionFilters = { ...current, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.period) params.set("period", next.period);
  if (next.trainerId) params.set("trainer", next.trainerId);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/subscriptions?${query}` : "/subscriptions";
}

export function hasSubscriptionFilters(filters: SubscriptionFilters): boolean {
  return Boolean(filters.status || filters.period || filters.trainerId);
}

export const subscriptionIdSchema = z.guid("Unknown subscription.");

export const closeReasonSchema = z
  .string()
  .trim()
  .min(CLOSE_REASON_MIN, `Give a reason of at least ${CLOSE_REASON_MIN} characters.`)
  .max(CLOSE_REASON_MAX, `Keep the reason to ${CLOSE_REASON_MAX} characters or fewer.`);

// Server action input.
export const cancelSubscriptionSchema = z.object({
  id: subscriptionIdSchema,
  reason: closeReasonSchema,
});
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

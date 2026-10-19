import { z } from "zod";
import { isIsoDate } from "@/lib/utils/time";
import type { BookingStatus, CancelledBy, PaymentStatus, SessionMode } from "@/types/database";
import { BOOKING_STATUS_ORDER } from "@/features/users/format";

/** Rows per list page; the list asks for one more to know whether a next page exists. */
export const BOOKING_PAGE_SIZE = 50;

/** admin_cancel_booking stops at 300 characters, admin_resolve_dispute's note at 1000. */
export const CANCEL_REASON_MAX = 300;
export const DISPUTE_NOTE_MAX = 1000;

export const BOOKING_STATUSES = BOOKING_STATUS_ORDER;
export const BOOKING_MODES = ["home", "online"] as const satisfies readonly SessionMode[];

/** Statuses admin_cancel_booking accepts. */
export const CANCELLABLE_STATUSES = [
  "requested",
  "confirmed",
  "reschedule_requested",
] as const satisfies readonly BookingStatus[];

/** Statuses admin_resolve_dispute accepts: a dispute is about a session that happened. */
export const DISPUTE_STATUSES = ["completed", "no_show"] as const satisfies readonly BookingStatus[];

export const DISPUTE_OUTCOMES = ["completed", "no_show", "cancelled"] as const;
export type DisputeOutcomeValue = (typeof DISPUTE_OUTCOMES)[number];

export const DISPUTE_OUTCOME_LABELS: Record<DisputeOutcomeValue, string> = {
  completed: "Completed: the session happened",
  no_show: "No-show stands",
  cancelled: "Cancelled by BRUTAL",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  not_required: "Not required",
  pending: "Pending",
  authorized: "Authorized",
  paid: "Paid",
  failed: "Failed",
  refund_pending: "Refund pending",
  partially_refunded: "Partly refunded",
  refunded: "Refunded",
  disputed: "Disputed",
};

export const CANCELLED_BY_LABELS: Record<CancelledBy, string> = {
  client: "Cancelled by the client",
  trainer: "Cancelled by the trainer",
  admin: "Cancelled by BRUTAL",
};

export function isCancellable(status: BookingStatus): boolean {
  return (CANCELLABLE_STATUSES as readonly string[]).includes(status);
}

/** True when admin_resolve_dispute would accept the booking (once, after the session). */
export function canResolveDispute(status: BookingStatus, disputeResolvedAt: string | null): boolean {
  return (DISPUTE_STATUSES as readonly string[]).includes(status) && disputeResolvedAt === null;
}

const uuid = z.guid("Unknown booking.");
export const bookingIdSchema = uuid;

/** List filters as they live in the URL; anything unknown is dropped, not an error. */
export type BookingFilters = {
  status: BookingStatus | null;
  mode: SessionMode | null;
  /** India-time dates, "YYYY-MM-DD", both inclusive. */
  from: string | null;
  to: string | null;
  trainerId: string | null;
  clientId: string | null;
  page: number;
};

export const EMPTY_BOOKING_FILTERS: BookingFilters = {
  status: null,
  mode: null,
  from: null,
  to: null,
  trainerId: null,
  clientId: null,
  page: 1,
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(values: readonly T[], raw: string | undefined): T | null {
  return raw !== undefined && (values as readonly string[]).includes(raw) ? (raw as T) : null;
}

function guidOrNull(raw: string | undefined): string | null {
  return raw && uuid.safeParse(raw).success ? raw : null;
}

function dateOrNull(raw: string | undefined): string | null {
  return raw && isIsoDate(raw) ? raw : null;
}

export function parseBookingFilters(params: SearchParams): BookingFilters {
  const page = Number(first(params.page));
  return {
    status: oneOf(BOOKING_STATUSES, first(params.status)),
    mode: oneOf(BOOKING_MODES, first(params.mode)),
    from: dateOrNull(first(params.from)),
    to: dateOrNull(first(params.to)),
    trainerId: guidOrNull(first(params.trainer)),
    clientId: guidOrNull(first(params.client)),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/**
 * The list URL for a set of filters. Changing any filter starts again at page 1 unless the
 * page is given, so a narrowed list never opens on an empty later page.
 */
export function bookingListHref(
  current: BookingFilters,
  change: Partial<BookingFilters> = {},
): string {
  const next: BookingFilters = { ...current, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.mode) params.set("mode", next.mode);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.trainerId) params.set("trainer", next.trainerId);
  if (next.clientId) params.set("client", next.clientId);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/bookings?${query}` : "/bookings";
}

export function hasBookingFilters(filters: BookingFilters): boolean {
  return Boolean(
    filters.status || filters.mode || filters.from || filters.to || filters.trainerId || filters.clientId,
  );
}

/** A range whose end comes before its start; the server would refuse it. */
export function invalidDateRange(filters: Pick<BookingFilters, "from" | "to">): boolean {
  return filters.from !== null && filters.to !== null && filters.to < filters.from;
}

// Server action inputs.

export const cancelBookingSchema = z.object({
  bookingId: uuid,
  reason: z
    .string()
    .trim()
    .min(1, "Give a reason for the cancellation.")
    .max(CANCEL_REASON_MAX, `Keep the reason to ${CANCEL_REASON_MAX} characters or fewer.`),
});

export const resolveDisputeSchema = z.object({
  bookingId: uuid,
  outcome: z.enum(DISPUTE_OUTCOMES, { error: "Choose an outcome." }),
  note: z
    .string()
    .trim()
    .min(1, "Record how the dispute was resolved.")
    .max(DISPUTE_NOTE_MAX, `Keep the note to ${DISPUTE_NOTE_MAX} characters or fewer.`),
});

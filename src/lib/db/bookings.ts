/*
 * The bookings data layer: the only file in src/ that spells the booking admin functions.
 * Reads run with the admin's session: admin_list_bookings and admin_get_booking need
 * bookings.read, and admin_get_booking adds the session address only for a caller holding
 * bookings.address (20261019000800); the trainer count scan reads bookings through
 * bookings_select_admin. admin_cancel_booking and admin_resolve_dispute check bookings.cancel.
 * Every wrapper throws AppError on failure.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type {
  AdminBookingListRow,
  BookingRow,
  BookingStatus,
  CancelledBy,
  PaymentStatus,
  SessionMode,
} from "@/types/database";

const TABLE = { bookings: "bookings" } as const;

const RPC = {
  list: "admin_list_bookings",
  get: "admin_get_booking",
  cancel: "admin_cancel_booking",
  resolveDispute: "admin_resolve_dispute",
} as const;

/** admin_list_bookings returns at most this many rows per call. */
export const BOOKING_LIST_MAX = 200;

const BOOKING_STATUS_VALUES = [
  "requested",
  "pending_confirmation",
  "confirmed",
  "reschedule_requested",
  "cancelled",
  "completed",
  "no_show",
  "disputed",
] as const satisfies readonly BookingStatus[];

const PAYMENT_STATUS_VALUES = [
  "not_required",
  "pending",
  "authorized",
  "paid",
  "failed",
  "refund_pending",
  "partially_refunded",
  "refunded",
  "disputed",
] as const satisfies readonly PaymentStatus[];

const CANCELLED_BY_VALUES = ["client", "trainer", "admin"] as const satisfies readonly CancelledBy[];

// The dispute column is jsonb, so its shape is checked before the panel renders it.
const disputeSchema = z
  .object({
    state: z.enum(["open", "resolved"]),
    case_id: z.string().nullable().optional(),
    case_status: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    resolved_at: z.string().nullable().optional(),
    resolved_by: z.string().nullable().optional(),
    resolved_by_name: z.string().nullable().optional(),
  })
  .nullable();

export type BookingDispute = {
  state: "open" | "resolved";
  caseId: string | null;
  caseStatus: string | null;
  note: string | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
};

export type BookingListRow = Omit<AdminBookingListRow, "dispute"> & {
  dispute: BookingDispute | null;
};

function toDispute(dispute: z.output<typeof disputeSchema>): BookingDispute | null {
  return dispute
    ? {
        state: dispute.state,
        caseId: dispute.case_id ?? null,
        caseStatus: dispute.case_status ?? null,
        note: dispute.note ?? null,
        resolvedAt: dispute.resolved_at ?? null,
        resolvedByName: dispute.resolved_by_name ?? null,
      }
    : null;
}

function toListRow(row: AdminBookingListRow): BookingListRow {
  const parsed = disputeSchema.safeParse(row.dispute);
  if (!parsed.success) {
    throw new AppError("UNKNOWN", "A booking came back in a shape the panel does not know.");
  }
  return { ...row, dispute: toDispute(parsed.data) };
}

export type BookingQuery = {
  status: BookingStatus | null;
  mode: SessionMode | null;
  /** UTC instants; `to` is exclusive. */
  from: string | null;
  to: string | null;
  trainerId: string | null;
  clientId: string | null;
  limit: number;
  offset: number;
};

/** Bookings newest session first, with names, the address flag and any dispute. */
export async function listBookings(
  client: AppSupabaseClient,
  query: BookingQuery,
): Promise<BookingListRow[]> {
  const { data, error } = await client.rpc(RPC.list, {
    p_status: query.status,
    p_mode: query.mode,
    p_from: query.from,
    p_to: query.to,
    p_trainer: query.trainerId,
    p_client: query.clientId,
    p_limit: query.limit,
    p_offset: query.offset,
  });
  if (error) throw toAppError(error);
  return data.map(toListRow);
}

const text = z.string().nullable().optional();

// The booking key is to_jsonb(bookings row); unknown columns are dropped.
const bookingRowSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  trainer_id: z.string(),
  service_id: z.string().nullable(),
  service_title: z.string(),
  mode: z.enum(["home", "online"]),
  start_at: z.string(),
  end_at: z.string(),
  duration_minutes: z.number(),
  price_snapshot_inr: z.number(),
  status: z.enum(BOOKING_STATUS_VALUES),
  payment_status: z.enum(PAYMENT_STATUS_VALUES),
  cancellation_policy: z.string(),
  cancellation_reason: z.string().nullable(),
  requested_start_at: z.string().nullable(),
  trainer_note: z.string().nullable(),
  cancelled_by: z.enum(CANCELLED_BY_VALUES).nullable().optional(),
  dispute_note: text,
  dispute_resolved_at: text,
  dispute_resolved_by: text,
  created_at: z.string(),
  updated_at: z.string(),
});

const partySchema = z.object({ id: z.string(), name: text }).nullable().optional();

const timelineEventSchema = z.object({
  event: z.string(),
  at: z.string(),
  by: z.string(),
  actor_id: text,
  actor_name: text,
  note: text,
  outcome: text,
});

const bookingDetailSchema = z.object({
  booking: bookingRowSchema,
  client: partySchema,
  trainer: partySchema,
  cancelled_by: z.enum([...CANCELLED_BY_VALUES, "unknown"]).nullable().optional(),
  timeline: z.array(timelineEventSchema),
  dispute: disputeSchema.optional(),
  has_address: z.boolean(),
  // Present only for a caller holding bookings.address; null means no address yet.
  address: z.string().nullable().optional(),
});

export type BookingParty = { id: string; name: string | null };

export type BookingTimelineEvent = {
  /** created, confirmed, reschedule_requested, rescheduled, reschedule_declined, cancelled, completed, no_show, dispute_resolved; others shown as they come. */
  event: string;
  at: string;
  /** client, trainer or admin. */
  by: string;
  actorName: string | null;
  note: string | null;
  /** Dispute outcome on dispute_resolved. */
  outcome: string | null;
};

export type BookingAddress = { visible: true; text: string | null } | { visible: false };

export type BookingDetail = {
  booking: BookingRow;
  client: BookingParty | null;
  trainer: BookingParty | null;
  /** Who cancelled, read by the server from the column or the reason it wrote; null unless cancelled. */
  cancelledBy: CancelledBy | "unknown" | null;
  timeline: BookingTimelineEvent[];
  dispute: BookingDispute | null;
  hasAddress: boolean;
  address: BookingAddress;
};

function hasKey(value: unknown, key: string): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value) && key in value;
}

/**
 * One booking with its parties, timeline, dispute and, only for a caller holding
 * bookings.address, the session address (admin_get_booking).
 */
export async function getBookingDetail(client: AppSupabaseClient, id: string): Promise<BookingDetail> {
  const { data, error } = await client.rpc(RPC.get, { p_id: id });
  if (error) throw toAppError(error);
  const parsed = bookingDetailSchema.safeParse(data);
  if (!parsed.success) {
    throw new AppError("UNKNOWN", "The booking came back in a shape the panel does not know.");
  }
  const detail = parsed.data;
  const party = (value: z.output<typeof partySchema>): BookingParty | null =>
    value ? { id: value.id, name: value.name ?? null } : null;
  return {
    booking: {
      ...detail.booking,
      cancelled_by: detail.booking.cancelled_by ?? null,
      dispute_note: detail.booking.dispute_note ?? null,
      dispute_resolved_at: detail.booking.dispute_resolved_at ?? null,
      dispute_resolved_by: detail.booking.dispute_resolved_by ?? null,
    },
    client: party(detail.client),
    trainer: party(detail.trainer),
    cancelledBy: detail.cancelled_by ?? null,
    timeline: detail.timeline.map((entry) => ({
      event: entry.event,
      at: entry.at,
      by: entry.by,
      actorName: entry.actor_name ?? null,
      note: entry.note ?? null,
      outcome: entry.outcome ?? null,
    })),
    dispute: toDispute(detail.dispute ?? null),
    hasAddress: detail.has_address,
    // The raw reply decides: a missing key means the caller lacks bookings.address.
    address: hasKey(data, "address") ? { visible: true, text: detail.address ?? null } : { visible: false },
  };
}

// Enough for every booking of the listed trainers at today's scale; the list says when hit.
export const BOOKING_COUNT_SCAN_LIMIT = 1000;

/**
 * Bookings per trainer, every status. No count function exists, so up to
 * BOOKING_COUNT_SCAN_LIMIT trainer ids are read and counted; `capped` says the scan was full
 * and the counts are floors.
 */
export async function countBookingsByTrainer(
  client: AppSupabaseClient,
  trainerIds: readonly string[],
): Promise<{ counts: Map<string, number>; capped: boolean }> {
  if (trainerIds.length === 0) return { counts: new Map(), capped: false };
  const { data, error } = await client
    .from(TABLE.bookings)
    .select("trainer_id")
    .in("trainer_id", [...trainerIds])
    .limit(BOOKING_COUNT_SCAN_LIMIT);
  if (error) throw toAppError(error);
  const counts = new Map<string, number>();
  for (const row of data) counts.set(row.trainer_id, (counts.get(row.trainer_id) ?? 0) + 1);
  return { counts, capped: data.length >= BOOKING_COUNT_SCAN_LIMIT };
}

/** Cancels on behalf of BRUTAL (requested, confirmed or reschedule requested only). */
export async function cancelBooking(
  client: AppSupabaseClient,
  input: { bookingId: string; reason: string },
): Promise<void> {
  const { error } = await client.rpc(RPC.cancel, {
    p_id: input.bookingId,
    p_reason: input.reason,
  });
  if (error) throw toAppError(error);
}

export type DisputeOutcome = "completed" | "no_show" | "cancelled";

/** Settles a completed or no-show session once, with the outcome and a note. */
export async function resolveDispute(
  client: AppSupabaseClient,
  input: { bookingId: string; outcome: DisputeOutcome; note: string },
): Promise<void> {
  const { error } = await client.rpc(RPC.resolveDispute, {
    p_id: input.bookingId,
    p_outcome: input.outcome,
    p_note: input.note,
  });
  if (error) throw toAppError(error);
}

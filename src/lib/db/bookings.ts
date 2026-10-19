/*
 * The bookings data layer: the only file in src/ that spells the booking admin functions and
 * booking_locations. Reads run with the admin's session: bookings need bookings.read
 * (bookings_select_admin), the session address needs bookings.address
 * (booking_locations_select_admin), both from 20261019000500. admin_cancel_booking and
 * admin_resolve_dispute check bookings.cancel. Every wrapper throws AppError on failure.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type {
  AdminBookingListRow,
  BookingRow,
  BookingStatus,
  SessionMode,
} from "@/types/database";

const TABLE = { bookings: "bookings", locations: "booking_locations" } as const;

const RPC = {
  list: "admin_list_bookings",
  cancel: "admin_cancel_booking",
  resolveDispute: "admin_resolve_dispute",
} as const;

/** admin_list_bookings returns at most this many rows per call. */
export const BOOKING_LIST_MAX = 200;

const BOOKING_COLUMNS =
  "id, client_id, trainer_id, service_id, service_title, mode, start_at, end_at, duration_minutes, price_snapshot_inr, status, payment_status, cancellation_policy, cancellation_reason, requested_start_at, trainer_note, cancelled_by, dispute_note, dispute_resolved_at, dispute_resolved_by, created_at, updated_at";

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

function toListRow(row: AdminBookingListRow): BookingListRow {
  const parsed = disputeSchema.safeParse(row.dispute);
  if (!parsed.success) {
    throw new AppError("UNKNOWN", "A booking came back in a shape the panel does not know.");
  }
  const dispute = parsed.data;
  return {
    ...row,
    dispute: dispute
      ? {
          state: dispute.state,
          caseId: dispute.case_id ?? null,
          caseStatus: dispute.case_status ?? null,
          note: dispute.note ?? null,
          resolvedAt: dispute.resolved_at ?? null,
          resolvedByName: dispute.resolved_by_name ?? null,
        }
      : null,
  };
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

export async function getBooking(client: AppSupabaseClient, id: string): Promise<BookingRow> {
  const { data, error } = await client
    .from(TABLE.bookings)
    .select(BOOKING_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError("BRNTF", "This booking does not exist.");
  return data;
}

/**
 * The list row for one booking (party names, address flag, dispute state). There is no
 * admin function for one booking, so the list is narrowed to its trainer, client and start
 * instant, and the row is picked by id.
 */
export async function getBookingListRow(
  client: AppSupabaseClient,
  booking: Pick<BookingRow, "id" | "trainer_id" | "client_id" | "start_at">,
): Promise<BookingListRow | null> {
  const start = new Date(booking.start_at).getTime();
  const rows = await listBookings(client, {
    status: null,
    mode: null,
    // One second either side covers the sub-millisecond part JavaScript dates drop.
    from: new Date(start - 1000).toISOString(),
    to: new Date(start + 1000).toISOString(),
    trainerId: booking.trainer_id,
    clientId: booking.client_id,
    limit: BOOKING_LIST_MAX,
    offset: 0,
  });
  return rows.find((row) => row.id === booking.id) ?? null;
}

/** The session address, or null when none is stored. RLS needs bookings.address. */
export async function getBookingAddress(
  client: AppSupabaseClient,
  bookingId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from(TABLE.locations)
    .select("address_text")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data?.address_text ?? null;
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

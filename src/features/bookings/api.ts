/*
 * Server-side loaders for the booking pages. The route needs bookings.read; the session
 * address needs bookings.address and is fetched only for a session that holds it.
 */
import {
  getBooking,
  getBookingAddress,
  getBookingListRow,
  listBookings,
  type BookingListRow,
} from "@/lib/db/bookings";
import { can } from "@/lib/rbac/can";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { istDatesToRange } from "@/lib/utils/time";
import type { SessionAccess } from "@/types/access";
import type { BookingRow } from "@/types/database";
import { missingPermissionMessage } from "@/features/users/format";
import {
  BOOKING_PAGE_SIZE,
  bookingIdSchema,
  invalidDateRange,
  type BookingFilters,
} from "@/features/bookings/schemas";

export type BookingListResult =
  | {
      ok: true;
      rows: BookingListRow[];
      hasNext: boolean;
      /** Names for the trainer and client filter chips, when a row on this page has them. */
      trainerName: string | null;
      clientName: string | null;
    }
  | { ok: false; error: string };

export async function loadBookingList(
  client: AppSupabaseClient,
  filters: BookingFilters,
): Promise<BookingListResult> {
  if (invalidDateRange(filters)) {
    return { ok: false, error: "The end date is before the start date. Change one of them." };
  }
  const range = istDatesToRange(filters.from, filters.to);
  try {
    // One extra row says whether a next page exists without a count query.
    const rows = await listBookings(client, {
      status: filters.status,
      mode: filters.mode,
      from: range.from,
      to: range.to,
      trainerId: filters.trainerId,
      clientId: filters.clientId,
      limit: BOOKING_PAGE_SIZE + 1,
      offset: (filters.page - 1) * BOOKING_PAGE_SIZE,
    });
    const page = rows.slice(0, BOOKING_PAGE_SIZE);
    return {
      ok: true,
      rows: page,
      hasNext: rows.length > BOOKING_PAGE_SIZE,
      trainerName: filters.trainerId ? (page[0]?.trainer_name ?? null) : null,
      clientName: filters.clientId ? (page[0]?.client_name ?? null) : null,
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export type BookingAddressState =
  | { kind: "ok"; text: string }
  | { kind: "none" }
  | { kind: "hidden"; reason: string }
  | { kind: "error"; message: string };

export type BookingDetailResult =
  | {
      ok: true;
      booking: BookingRow;
      /** Party names, the address flag and the dispute state; null if the list lookup missed. */
      summary: BookingListRow | null;
      address: BookingAddressState;
    }
  | { ok: false; error: string };

async function loadAddress(
  client: AppSupabaseClient,
  access: SessionAccess,
  bookingId: string,
): Promise<BookingAddressState> {
  if (!can(access.permissions, "bookings.address")) {
    return { kind: "hidden", reason: missingPermissionMessage("bookings.address", "The session address") };
  }
  try {
    const text = await getBookingAddress(client, bookingId);
    return text ? { kind: "ok", text } : { kind: "none" };
  } catch (error) {
    return { kind: "error", message: toAppError(error).message };
  }
}

export async function loadBookingDetail(
  client: AppSupabaseClient,
  access: SessionAccess,
  id: string,
): Promise<BookingDetailResult> {
  if (!bookingIdSchema.safeParse(id).success) {
    return { ok: false, error: "This booking does not exist." };
  }
  try {
    const booking = await getBooking(client, id);
    const [summary, address] = await Promise.all([
      getBookingListRow(client, booking),
      loadAddress(client, access, id),
    ]);
    return { ok: true, booking, summary, address };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

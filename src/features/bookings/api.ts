/*
 * Server-side loaders for the booking pages. The route needs bookings.read; the detail is one
 * admin_get_booking call, which carries the session address only for bookings.address. A gym
 * booking's gym is read from booking_details under the same key.
 */
import {
  getBookingDetail,
  listBookingGyms,
  listBookings,
  type BookingDetail,
  type BookingGym,
  type BookingListRow,
} from "@/lib/db/bookings";
import { listUserAvatarsOrEmpty, type UserAvatarMap } from "@/lib/db/avatars";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { istDatesToRange } from "@/lib/utils/time";
import type { SessionAccess } from "@/types/access";
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
      /** Client and trainer avatars for this page; empty without users.read or on failure. */
      avatars: UserAvatarMap;
      /** Gym names by booking id, for the rows still waiting on a gym to allot a trainer. */
      gymNames: Record<string, string>;
    }
  | { ok: false; error: string };

export async function loadBookingList(
  client: AppSupabaseClient,
  access: SessionAccess,
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
    const [avatars, gymNames] = await Promise.all([
      listUserAvatarsOrEmpty(
        client,
        access.permissions,
        page.flatMap((row) => [row.client_id, row.trainer_id]),
      ),
      unallottedGymNames(
        client,
        page.filter((row) => row.trainer_id === null).map((row) => row.id),
      ),
    ]);
    return {
      ok: true,
      rows: page,
      hasNext: rows.length > BOOKING_PAGE_SIZE,
      trainerName: filters.trainerId ? (page[0]?.trainer_name ?? null) : null,
      clientName: filters.clientId ? (page[0]?.client_name ?? null) : null,
      avatars,
      gymNames,
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

/**
 * The gym names of bookings without a trainer. Best effort: the rows still say "Awaiting gym
 * allotment" without the name, so a failed read does not take the whole list down.
 */
async function unallottedGymNames(
  client: AppSupabaseClient,
  bookingIds: readonly string[],
): Promise<Record<string, string>> {
  try {
    const gyms = await listBookingGyms(client, bookingIds);
    return Object.fromEntries([...gyms].map(([id, gym]) => [id, gym.name]));
  } catch {
    return {};
  }
}

export type BookingAddressState =
  | { kind: "ok"; text: string }
  | { kind: "none" }
  | { kind: "hidden"; reason: string };

export type BookingDetailResult =
  | {
      ok: true;
      detail: BookingDetail;
      address: BookingAddressState;
      /** The gym of a gym booking; null otherwise, or when its name could not be read. */
      gym: BookingGym | null;
    }
  | { ok: false; error: string };

/** The address card state from the reply: the server leaves the key out without bookings.address. */
function addressState(address: BookingDetail["address"]): BookingAddressState {
  if (!address.visible) {
    return { kind: "hidden", reason: missingPermissionMessage("bookings.address", "The session address") };
  }
  return address.text ? { kind: "ok", text: address.text } : { kind: "none" };
}

export async function loadBookingDetail(
  client: AppSupabaseClient,
  id: string,
): Promise<BookingDetailResult> {
  if (!bookingIdSchema.safeParse(id).success) {
    return { ok: false, error: "This booking does not exist." };
  }
  try {
    const detail = await getBookingDetail(client, id);
    const gym = detail.gymId ? ((await listBookingGyms(client, [detail.booking.id])).get(detail.booking.id) ?? null) : null;
    return { ok: true, detail, address: addressState(detail.address), gym };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

/*
 * Server-side loaders for the payment pages and the booking page's Payment card. Payments need
 * payments.read; the booking behind each payment (names, session) needs bookings.read and is
 * left out without it; a search by phone also needs users.read (admin_list_users matches the
 * phone's digits) and bookings.read (the client's bookings).
 */
import {
  getBookingPayment,
  getPayment,
  listBookingIdsForClients,
  listPaymentBookings,
  listPayments,
  type PaymentBooking,
  type PaymentListRow,
  type PaymentSearch,
} from "@/lib/db/payments";
import { listUsers } from "@/lib/db/rbac";
import { can } from "@/lib/rbac/can";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { istDatesToRange } from "@/lib/utils/time";
import type { SessionAccess } from "@/types/access";
import type { PaymentRow } from "@/types/database";
import { missingPermissionMessage } from "@/features/users/format";
import {
  PAYMENT_PAGE_SIZE,
  ATTENTION_AGE_MS,
  effectiveDateRange,
  invalidPaymentRange,
  parsePaymentSearch,
  paymentIdSchema,
  type PaymentFilters,
} from "@/features/payments/schemas";

/** How many users a phone search may match before it asks for more digits. */
const PHONE_SEARCH_USERS_MAX = 50;

/** The bookings behind a page of payments, or why they are not shown. */
export type PaymentBookingsState =
  | { kind: "ok"; bookings: Record<string, PaymentBooking> }
  | { kind: "hidden"; reason: string }
  | { kind: "error"; reason: string };

export type PaymentListResult =
  | {
      ok: true;
      rows: PaymentListRow[];
      hasNext: boolean;
      bookings: PaymentBookingsState;
      /** The dates the list read (India time), so the filters can show the default window. */
      range: { from: string | null; to: string | null };
    }
  | { ok: false; error: string; range: { from: string | null; to: string | null } };

async function bookingsFor(
  client: AppSupabaseClient,
  access: SessionAccess,
  bookingIds: readonly string[],
): Promise<PaymentBookingsState> {
  if (!can(access.permissions, "bookings.read")) {
    return { kind: "hidden", reason: missingPermissionMessage("bookings.read", "Client, trainer and session details") };
  }
  try {
    return { kind: "ok", bookings: Object.fromEntries(await listPaymentBookings(client, bookingIds)) };
  } catch (error) {
    return { kind: "error", reason: toAppError(error).message };
  }
}

/** A phone search as booking ids, or the reason it cannot run. */
async function phoneSearch(
  client: AppSupabaseClient,
  access: SessionAccess,
  digits: string,
): Promise<{ ok: true; search: PaymentSearch } | { ok: false; error: string }> {
  if (!can(access.permissions, "users.read")) {
    return { ok: false, error: missingPermissionMessage("users.read", "Searching by phone") };
  }
  if (!can(access.permissions, "bookings.read")) {
    return { ok: false, error: missingPermissionMessage("bookings.read", "Searching by phone") };
  }
  const users = await listUsers(client, { query: digits, limit: PHONE_SEARCH_USERS_MAX + 1, offset: 0 });
  if (users.length > PHONE_SEARCH_USERS_MAX) {
    return { ok: false, error: "More than 50 people match those digits. Type more of the number." };
  }
  const ids = await listBookingIdsForClients(
    client,
    users.map((user) => user.id),
  );
  return { ok: true, search: { kind: "bookings", ids } };
}

export async function loadPaymentList(
  client: AppSupabaseClient,
  access: SessionAccess,
  filters: PaymentFilters,
  now: number,
): Promise<PaymentListResult> {
  const range = effectiveDateRange(filters, now);
  if (invalidPaymentRange(range)) {
    return { ok: false, error: "The end date is before the start date. Change one of them.", range };
  }
  const parsedSearch = parsePaymentSearch(filters.q);
  if (parsedSearch.kind === "invalid") return { ok: false, error: parsedSearch.message, range };
  try {
    let search: PaymentSearch | null = null;
    if (parsedSearch.kind === "id") search = parsedSearch.search;
    if (parsedSearch.kind === "phone") {
      const resolved = await phoneSearch(client, access, parsedSearch.digits);
      if (!resolved.ok) return { ok: false, error: resolved.error, range };
      search = resolved.search;
    }
    const instants = istDatesToRange(range.from, range.to);
    // One extra row says whether a next page exists without a count query.
    const rows = await listPayments(client, {
      state: filters.state,
      attentionBefore: filters.attention ? new Date(now - ATTENTION_AGE_MS).toISOString() : null,
      from: instants.from,
      to: instants.to,
      search,
      limit: PAYMENT_PAGE_SIZE + 1,
      offset: (filters.page - 1) * PAYMENT_PAGE_SIZE,
    });
    const page = rows.slice(0, PAYMENT_PAGE_SIZE);
    const bookings = await bookingsFor(
      client,
      access,
      page.map((row) => row.booking_id),
    );
    return { ok: true, rows: page, hasNext: rows.length > PAYMENT_PAGE_SIZE, bookings, range };
  } catch (error) {
    return { ok: false, error: toAppError(error).message, range };
  }
}

export type PaymentDetailResult =
  | { ok: true; payment: PaymentRow; booking: PaymentBooking | null; bookingState: PaymentBookingsState }
  | { ok: false; error: string };

export async function loadPaymentDetail(
  client: AppSupabaseClient,
  access: SessionAccess,
  id: string,
): Promise<PaymentDetailResult> {
  if (!paymentIdSchema.safeParse(id).success) return { ok: false, error: "This payment does not exist." };
  try {
    const payment = await getPayment(client, id);
    const bookingState = await bookingsFor(client, access, [payment.booking_id]);
    const booking = bookingState.kind === "ok" ? (bookingState.bookings[payment.booking_id] ?? null) : null;
    return { ok: true, payment, booking, bookingState };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

/** The booking page's Payment card. */
export type BookingPaymentState =
  | { kind: "ok"; payment: PaymentListRow }
  | { kind: "none" }
  | { kind: "hidden"; reason: string }
  | { kind: "error"; reason: string };

export async function loadBookingPayment(
  client: AppSupabaseClient,
  access: SessionAccess,
  bookingId: string,
): Promise<BookingPaymentState> {
  // Without payments.read the table returns nothing, which would read as "no payment".
  if (!can(access.permissions, "payments.read")) {
    return { kind: "hidden", reason: missingPermissionMessage("payments.read", "The payment") };
  }
  try {
    const payment = await getBookingPayment(client, bookingId);
    return payment ? { kind: "ok", payment } : { kind: "none" };
  } catch (error) {
    return { kind: "error", reason: toAppError(error).message };
  }
}

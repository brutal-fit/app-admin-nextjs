/*
 * The payments data layer: the only file in src/ that spells the payments table and the
 * `refund` Edge Function (20261022151245_payments.sql, functions/refund). Reads run with the
 * admin's session: payments_select_admin admits payments.read; the booking summaries come from
 * booking_details (security invoker, bookings_select_admin: bookings.read); a phone search maps
 * client ids to their booking ids through bookings (same policy). A refund goes through the
 * `refund` function with the admin's own JWT, which checks payments.manage itself. Every
 * wrapper throws AppError on failure.
 */
import { z } from "zod";
import { AppError, functionErrorToAppError, toAppError, type FunctionErrorBody } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { BookingStatus, PaymentRow, PaymentState, RefundFunctionBody, SessionMode } from "@/types/database";

const TABLE = { payments: "payments", bookings: "bookings", bookingDetails: "booking_details" } as const;
const FUNCTION = { refund: "refund" } as const;

export const PAYMENT_STATE_VALUES = [
  "created",
  "paid",
  "failed",
  "refund_pending",
  "refund_requested",
  "refunded",
  "refund_failed",
] as const satisfies readonly PaymentState[];

/** States the database counts as the booking's live payment (payments_one_live_per_booking). */
const LIVE_STATES: readonly PaymentState[] = ["created", "paid", "refund_pending", "refund_requested"];

/** A payment as the list shows it: every column except the raw event. */
export type PaymentListRow = Omit<PaymentRow, "raw">;

const LIST_COLUMNS =
  "id, booking_id, provider, order_id, payment_id, amount_inr, currency, state, signature_verified, refund_id, refund_amount_inr, refund_reason, refund_attempts, last_event_id, created_at, updated_at";
const DETAIL_COLUMNS = `${LIST_COLUMNS}, raw` as const;

/**
 * What a list search matched on. Ids are matched exactly; `bookings` carries the booking ids
 * a phone search found (the caller resolves the phone first).
 */
export type PaymentSearch =
  | { kind: "uuid"; value: string }
  | { kind: "order"; value: string }
  | { kind: "payment"; value: string }
  | { kind: "provider_id"; value: string }
  | { kind: "bookings"; ids: readonly string[] };

export type PaymentQuery = {
  state: PaymentState | null;
  /**
   * Needs attention: every refund_failed payment plus refund_pending ones last changed before
   * this instant. Replaces the state filter when set.
   */
  attentionBefore: string | null;
  /** UTC instants on created_at; `to` is exclusive. */
  from: string | null;
  to: string | null;
  search: PaymentSearch | null;
  limit: number;
  offset: number;
};

/** Payments newest first, narrowed by the query. */
export async function listPayments(client: AppSupabaseClient, query: PaymentQuery): Promise<PaymentListRow[]> {
  if (query.search?.kind === "bookings" && query.search.ids.length === 0) return [];
  let request = client.from(TABLE.payments).select(LIST_COLUMNS);
  if (query.attentionBefore) {
    // Quoted: the instant holds characters the filter grammar reserves.
    request = request.or(
      `state.eq.refund_failed,and(state.eq.refund_pending,updated_at.lt."${query.attentionBefore}")`,
    );
  } else if (query.state) {
    request = request.eq("state", query.state);
  }
  if (query.from) request = request.gte("created_at", query.from);
  if (query.to) request = request.lt("created_at", query.to);
  const search = query.search;
  if (search) {
    switch (search.kind) {
      case "uuid":
        // A uuid is either the booking's id or the payment's own id.
        request = request.or(`booking_id.eq.${search.value},id.eq.${search.value}`);
        break;
      case "order":
        request = request.eq("order_id", search.value);
        break;
      case "payment":
        request = request.eq("payment_id", search.value);
        break;
      case "provider_id":
        request = request.or(`order_id.eq.${search.value},payment_id.eq.${search.value}`);
        break;
      case "bookings":
        request = request.in("booking_id", [...search.ids]);
        break;
    }
  }
  const { data, error } = await request
    .order("created_at", { ascending: false })
    .range(query.offset, query.offset + query.limit - 1);
  if (error) throw toAppError(error);
  return data;
}

/** One payment with its raw event, or BRNTF. */
export async function getPayment(client: AppSupabaseClient, id: string): Promise<PaymentRow> {
  const { data, error } = await client.from(TABLE.payments).select(DETAIL_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError("BRNTF", "This payment does not exist.");
  return data;
}

/**
 * The payment a booking card shows: the live one, else the latest (a refunded or failed
 * payment is no longer live), the same pick booking_details makes. Null when the booking has
 * none, which is every booking made before payments.
 */
export async function getBookingPayment(client: AppSupabaseClient, bookingId: string): Promise<PaymentListRow | null> {
  const { data, error } = await client
    .from(TABLE.payments)
    .select(LIST_COLUMNS)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw toAppError(error);
  return data.find((row) => LIVE_STATES.includes(row.state)) ?? data[0] ?? null;
}

export type PaymentBooking = {
  id: string;
  serviceTitle: string;
  mode: SessionMode;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  clientId: string;
  clientName: string | null;
  trainerId: string | null;
  trainerName: string | null;
  gymId: string | null;
  gymName: string | null;
};

/** The bookings behind the given payments, keyed by booking id (booking_details, bookings.read). */
export async function listPaymentBookings(
  client: AppSupabaseClient,
  bookingIds: readonly string[],
): Promise<Map<string, PaymentBooking>> {
  const bookings = new Map<string, PaymentBooking>();
  const ids = [...new Set(bookingIds)];
  if (ids.length === 0) return bookings;
  const { data, error } = await client
    .from(TABLE.bookingDetails)
    .select("id, service_title, mode, start_at, end_at, status, client_id, client_name, trainer_id, trainer_name, gym_id, gym_name")
    .in("id", ids);
  if (error) throw toAppError(error);
  for (const row of data) {
    bookings.set(row.id, {
      id: row.id,
      serviceTitle: row.service_title,
      mode: row.mode,
      startAt: row.start_at,
      endAt: row.end_at,
      status: row.status,
      clientId: row.client_id,
      clientName: row.client_name,
      trainerId: row.trainer_id,
      trainerName: row.trainer_name,
      gymId: row.gym_id,
      gymName: row.gym_name,
    });
  }
  return bookings;
}

// Enough for every booking of the clients a phone search finds at today's scale.
export const PHONE_SEARCH_BOOKINGS_MAX = 500;

/** Booking ids of the given clients, for a search by the client's phone (bookings.read). */
export async function listBookingIdsForClients(
  client: AppSupabaseClient,
  clientIds: readonly string[],
): Promise<string[]> {
  if (clientIds.length === 0) return [];
  const { data, error } = await client
    .from(TABLE.bookings)
    .select("id")
    .in("client_id", [...clientIds])
    .limit(PHONE_SEARCH_BOOKINGS_MAX);
  if (error) throw toAppError(error);
  return data.map((row) => row.id);
}

/**
 * What a manual refund came to. `requested`: Razorpay accepted it and the payment is
 * refund_requested until the webhook says refunded or refund_failed. `provider_error`:
 * Razorpay refused the call; the payment keeps the state the function reports.
 */
export type RefundOutcome =
  | { outcome: "requested"; state: PaymentState; refundId: string }
  | { outcome: "provider_error"; state: PaymentState | null; message: string };

const refundReplySchema = z.object({
  refund_id: z.string(),
  state: z.enum(PAYMENT_STATE_VALUES),
});

const refundErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  state: z.enum(PAYMENT_STATE_VALUES).optional(),
});

type ResponseLike = { status: number; json: () => Promise<unknown> };

function isResponseLike(value: unknown): value is ResponseLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof value.status === "number" &&
    "json" in value &&
    typeof value.json === "function"
  );
}

/** The status and body of a FunctionsHttpError; null when the call never got a reply. */
async function readFunctionError(error: unknown): Promise<{ status: number; body: z.output<typeof refundErrorSchema> | null } | null> {
  const context = typeof error === "object" && error !== null && "context" in error ? error.context : null;
  if (!isResponseLike(context)) return null;
  let body: unknown = null;
  try {
    body = await context.json();
  } catch {
    body = null;
  }
  const parsed = refundErrorSchema.safeParse(body);
  return { status: context.status, body: parsed.success ? parsed.data : null };
}

/**
 * Refunds a payment in full through the `refund` Edge Function, as the signed-in admin (the
 * function checks payments.manage and the state: paid, refund_pending or refund_failed).
 */
export async function refundPayment(
  client: AppSupabaseClient,
  input: { paymentId: string; reason: string },
): Promise<RefundOutcome> {
  const body: RefundFunctionBody = { payment_id: input.paymentId, reason: input.reason };
  const { data, error } = await client.functions.invoke(FUNCTION.refund, { body });
  if (!error) {
    const parsed = refundReplySchema.safeParse(data);
    if (!parsed.success) {
      throw new AppError("UNKNOWN", "The refund reply came back in a shape the panel does not know.");
    }
    return { outcome: "requested", state: parsed.data.state, refundId: parsed.data.refund_id };
  }
  const reply = await readFunctionError(error);
  if (!reply) {
    const name = typeof error === "object" && error !== null && "name" in error ? error.name : null;
    throw new AppError(name === "FunctionsFetchError" ? "NETWORK" : "UNKNOWN");
  }
  const errorBody: FunctionErrorBody | null = reply.body;
  const appError = functionErrorToAppError(reply.status, errorBody);
  if (reply.body?.code === "provider_error") {
    return { outcome: "provider_error", state: reply.body.state ?? null, message: appError.message };
  }
  throw appError;
}

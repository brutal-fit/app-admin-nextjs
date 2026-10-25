/*
 * The subscriptions data layer: the only file in src/ that spells subscriptions,
 * subscription_slots, subscription_periods and cancel_subscription
 * (20261024032759_subscriptions.sql). Reads run with the admin's session: the *_select_admin
 * policies admit bookings.read; the sessions come from booking_details (bookings.read). An
 * admin cancels through cancel_subscription, which checks bookings.cancel itself, takes a
 * reason up to 300 characters and queues the refunds on the periods' payments. Every wrapper
 * throws AppError on failure.
 */
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type {
  BookingStatus,
  PaymentStatus,
  SubscriptionPeriodKind,
  SubscriptionPeriodRow,
  SubscriptionRow,
  SubscriptionSlotRow,
  SubscriptionStatus,
} from "@/types/database";

const TABLE = {
  subscriptions: "subscriptions",
  slots: "subscription_slots",
  periods: "subscription_periods",
  bookingDetails: "booking_details",
} as const;
const RPC = { cancel: "cancel_subscription" } as const;

export const SUBSCRIPTION_STATUS_VALUES = [
  "requested",
  "active",
  "paused",
  "cancelled",
  "expired",
] as const satisfies readonly SubscriptionStatus[];

export const SUBSCRIPTION_PERIOD_VALUES = ["week", "month", "quarter"] as const satisfies readonly SubscriptionPeriodKind[];

export type SubscriptionQuery = {
  status: SubscriptionStatus | null;
  trainerId: string | null;
  period: SubscriptionPeriodKind | null;
  limit: number;
  offset: number;
};

/** Subscriptions newest first, narrowed by the query. */
export async function listSubscriptions(
  client: AppSupabaseClient,
  query: SubscriptionQuery,
): Promise<SubscriptionRow[]> {
  let request = client.from(TABLE.subscriptions).select("*");
  if (query.status) request = request.eq("status", query.status);
  if (query.trainerId) request = request.eq("trainer_id", query.trainerId);
  if (query.period) request = request.eq("period", query.period);
  const { data, error } = await request
    .order("created_at", { ascending: false })
    .range(query.offset, query.offset + query.limit - 1);
  if (error) throw toAppError(error);
  return data;
}

/** One subscription, or BRNTF. */
export async function getSubscription(client: AppSupabaseClient, id: string): Promise<SubscriptionRow> {
  const { data, error } = await client.from(TABLE.subscriptions).select("*").eq("id", id).maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError("BRNTF", "This subscription does not exist.");
  return data;
}

/** The weekly slots, Monday first. */
export async function listSubscriptionSlots(
  client: AppSupabaseClient,
  subscriptionId: string,
): Promise<SubscriptionSlotRow[]> {
  const { data, error } = await client
    .from(TABLE.slots)
    .select("subscription_id, weekday, start_minute")
    .eq("subscription_id", subscriptionId)
    .order("weekday")
    .order("start_minute");
  if (error) throw toAppError(error);
  return data;
}

/** The periods of the given subscriptions, in order. */
export async function listSubscriptionPeriods(
  client: AppSupabaseClient,
  subscriptionIds: readonly string[],
): Promise<SubscriptionPeriodRow[]> {
  const ids = [...new Set(subscriptionIds)];
  if (ids.length === 0) return [];
  const { data, error } = await client
    .from(TABLE.periods)
    .select("*")
    .in("subscription_id", ids)
    .order("subscription_id")
    .order("seq");
  if (error) throw toAppError(error);
  return data;
}

/** The subscription a period belongs to, or null when the period is not visible. */
export async function getPeriodSubscriptionId(client: AppSupabaseClient, periodId: string): Promise<string | null> {
  const { data, error } = await client
    .from(TABLE.periods)
    .select("subscription_id")
    .eq("id", periodId)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? data.subscription_id : null;
}

export type SubscriptionSession = {
  id: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  clientName: string | null;
  trainerName: string | null;
};

// Twelve weeks at up to seven sessions a week, with room for credits and moved sessions.
export const SUBSCRIPTION_SESSIONS_MAX = 120;

/** The sessions of a subscription, soonest first (booking_details, bookings.read). */
export async function listSubscriptionSessions(
  client: AppSupabaseClient,
  subscriptionId: string,
): Promise<SubscriptionSession[]> {
  const { data, error } = await client
    .from(TABLE.bookingDetails)
    .select("id, start_at, end_at, status, payment_status, client_name, trainer_name")
    .eq("subscription_id", subscriptionId)
    .order("start_at")
    .limit(SUBSCRIPTION_SESSIONS_MAX);
  if (error) throw toAppError(error);
  return data.map((row) => ({
    id: row.id,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    paymentStatus: row.payment_status,
    clientName: row.client_name,
    trainerName: row.trainer_name,
  }));
}

/**
 * Cancels on behalf of BRUTAL (cancel_subscription in admin mode, bookings.cancel). Unpaid
 * periods lapse, paid periods that have not started are refunded in full and the current one
 * for every session still ahead; the client and, once shown to them, the trainer are told.
 */
export async function cancelSubscription(
  client: AppSupabaseClient,
  input: { id: string; reason: string },
): Promise<SubscriptionRow> {
  const { data, error } = await client.rpc(RPC.cancel, { p_id: input.id, p_reason: input.reason });
  if (error) throw toAppError(error);
  return data;
}

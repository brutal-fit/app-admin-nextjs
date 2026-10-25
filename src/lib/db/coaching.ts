/*
 * The coaching and custom plans data layer: the only file in src/ that spells
 * programme_coaching, coaching_periods, custom_plans, custom_plan_days, custom_plan_items and
 * end_coaching (20261024035357_coaching_and_custom_plans.sql), plus the plan titles and
 * exercise names they show. Reads run with the admin's session: coaching and its months need
 * bookings.read, custom plans, days and items catalogue.manage; active plan titles and every
 * exercise are readable when signed in. An admin ends a coaching through end_coaching, which
 * checks bookings.cancel itself, takes a reason up to 300 characters and refunds every paid
 * month. Every wrapper throws AppError on failure.
 */
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type {
  CoachingPeriodRow,
  CoachingStatus,
  CustomPlanDayRow,
  CustomPlanItemRow,
  CustomPlanRow,
  ProgrammeCoachingRow,
} from "@/types/database";

const TABLE = {
  coaching: "programme_coaching",
  periods: "coaching_periods",
  plans: "custom_plans",
  days: "custom_plan_days",
  items: "custom_plan_items",
  programmePlans: "programme_plans",
  exercises: "exercises",
} as const;
const RPC = { end: "end_coaching" } as const;

export const COACHING_STATUS_VALUES = ["requested", "active", "cancelled", "expired"] as const satisfies readonly CoachingStatus[];

export type CoachingQuery = {
  status: CoachingStatus | null;
  coachId: string | null;
  limit: number;
  offset: number;
};

/** Coachings newest first, narrowed by the query. */
export async function listCoachings(client: AppSupabaseClient, query: CoachingQuery): Promise<ProgrammeCoachingRow[]> {
  let request = client.from(TABLE.coaching).select("*");
  if (query.status) request = request.eq("status", query.status);
  if (query.coachId) request = request.eq("coach_id", query.coachId);
  const { data, error } = await request
    .order("created_at", { ascending: false })
    .range(query.offset, query.offset + query.limit - 1);
  if (error) throw toAppError(error);
  return data;
}

/** One coaching, or BRNTF. */
export async function getCoaching(client: AppSupabaseClient, id: string): Promise<ProgrammeCoachingRow> {
  const { data, error } = await client.from(TABLE.coaching).select("*").eq("id", id).maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError("BRNTF", "This coaching does not exist.");
  return data;
}

/** The months of the given coachings, in order. */
export async function listCoachingPeriods(
  client: AppSupabaseClient,
  coachingIds: readonly string[],
): Promise<CoachingPeriodRow[]> {
  const ids = [...new Set(coachingIds)];
  if (ids.length === 0) return [];
  const { data, error } = await client
    .from(TABLE.periods)
    .select("*")
    .in("coaching_id", ids)
    .order("coaching_id")
    .order("seq");
  if (error) throw toAppError(error);
  return data;
}

/** The coaching a month belongs to, or null when the month is not visible. */
export async function getPeriodCoachingId(client: AppSupabaseClient, periodId: string): Promise<string | null> {
  const { data, error } = await client.from(TABLE.periods).select("coaching_id").eq("id", periodId).maybeSingle();
  if (error) throw toAppError(error);
  return data ? data.coaching_id : null;
}

/**
 * Titles of the given library plans. Only active plans are readable outside catalogue.manage,
 * so a retired plan is missing from the map.
 */
export async function listPlanTitles(
  client: AppSupabaseClient,
  planIds: readonly string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(planIds)];
  if (ids.length === 0) return new Map();
  const { data, error } = await client.from(TABLE.programmePlans).select("id, title").in("id", ids);
  if (error) throw toAppError(error);
  return new Map(data.map((row) => [row.id, row.title]));
}

/**
 * Ends a coaching on behalf of BRUTAL (end_coaching in admin mode, bookings.cancel). Unpaid
 * months lapse, every paid month is refunded in full, the programme locks again unless it was
 * free, and both the client and the coach are told.
 */
export async function endCoaching(
  client: AppSupabaseClient,
  input: { id: string; reason: string },
): Promise<ProgrammeCoachingRow> {
  const { data, error } = await client.rpc(RPC.end, { p_id: input.id, p_reason: input.reason });
  if (error) throw toAppError(error);
  return data;
}

// Plenty for one trainer or one client at today's scale.
export const CUSTOM_PLANS_MAX = 50;

/** Custom plans of a trainer or of a client, newest first (catalogue.manage). */
export async function listCustomPlans(
  client: AppSupabaseClient,
  owner: { trainerId: string } | { clientId: string },
): Promise<CustomPlanRow[]> {
  const request = client.from(TABLE.plans).select("*");
  const filtered =
    "trainerId" in owner ? request.eq("trainer_id", owner.trainerId) : request.eq("client_id", owner.clientId);
  const { data, error } = await filtered.order("created_at", { ascending: false }).limit(CUSTOM_PLANS_MAX);
  if (error) throw toAppError(error);
  return data;
}

/** The days of the given plans, by week and weekday. */
export async function listCustomPlanDays(
  client: AppSupabaseClient,
  planIds: readonly string[],
): Promise<CustomPlanDayRow[]> {
  const ids = [...new Set(planIds)];
  if (ids.length === 0) return [];
  const { data, error } = await client
    .from(TABLE.days)
    .select("*")
    .in("plan_id", ids)
    .order("week")
    .order("weekday");
  if (error) throw toAppError(error);
  return data;
}

/** The exercises of the given days, in order. */
export async function listCustomPlanItems(
  client: AppSupabaseClient,
  dayIds: readonly string[],
): Promise<CustomPlanItemRow[]> {
  const ids = [...new Set(dayIds)];
  if (ids.length === 0) return [];
  const { data, error } = await client.from(TABLE.items).select("*").in("day_id", ids).order("seq");
  if (error) throw toAppError(error);
  return data;
}

/** Library exercise names by id; retired exercises stay readable. */
export async function listExerciseNames(
  client: AppSupabaseClient,
  exerciseIds: readonly string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(exerciseIds)];
  if (ids.length === 0) return new Map();
  const { data, error } = await client.from(TABLE.exercises).select("id, name").in("id", ids);
  if (error) throw toAppError(error);
  return new Map(data.map((row) => [row.id, row.name]));
}

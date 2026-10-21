/*
 * The programmes data layer: the only file in src/ that spells the programme tables and
 * functions (20261021124448_programmes.sql). Every call runs with the admin's own session.
 * Plans are read and written through the admin functions (catalogue.manage, audited); days
 * and items are read straight from their tables, which every signed-in account may read,
 * and written a whole day at a time through admin_upsert_programme_day. Enrolments come from
 * admin_list_enrolments (users.read). Every wrapper throws AppError on failure, and every
 * jsonb reply is checked with Zod before the panel renders it.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { Json, ProgrammeDayRow, ProgrammeItemRow } from "@/types/database";

const TABLE = {
  days: "programme_days",
  items: "programme_items",
  listings: "trainer_listings",
} as const;

const RPC = {
  listPlans: "admin_list_programme_plans",
  upsertPlan: "admin_upsert_programme_plan",
  upsertDay: "admin_upsert_programme_day",
  setActive: "admin_set_plan_active",
  listEnrolments: "admin_list_enrolments",
} as const;

const text = z.string().nullable().optional();
const count = z.number().int().nonnegative();

export const PROGRAMME_LEVEL_VALUES = ["beginner", "regular", "advanced"] as const;
export const PROGRAMME_STAGE_VALUES = [
  "enrolled",
  "trainer_assigned",
  "assessment_booked",
  "active",
  "completed",
  "cancelled",
] as const;
export const PROGRAMME_ITEM_KIND_VALUES = ["workout", "nutrition", "habit", "rest", "call"] as const;

/** The stored programme_plans row, as admin_upsert_programme_plan and admin_set_plan_active return it. */
export const programmePlanRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  tagline: z.string(),
  description: z.string(),
  weeks: z.number().int(),
  level: z.enum(PROGRAMME_LEVEL_VALUES),
  equipment: z.array(z.string()),
  weekly_price_inr: z.number().int(),
  popular: z.boolean(),
  active: z.boolean(),
  default_trainer_id: z.string().nullable(),
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProgrammePlanRow = z.infer<typeof programmePlanRowSchema>;

/** One row of admin_list_programme_plans: the plan, the default trainer's name and counts from rows. */
export const adminProgrammePlanSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  tagline: z.string(),
  description: z.string(),
  weeks: z.number().int(),
  level: z.enum(PROGRAMME_LEVEL_VALUES),
  equipment: z.array(z.string()),
  weekly_price_inr: z.number().int(),
  popular: z.boolean(),
  active: z.boolean(),
  sort_order: z.number().int(),
  default_trainer_id: z.string().nullable(),
  default_trainer_name: text,
  day_count: count,
  item_count: count,
  open_enrolments: count,
  created_at: z.string(),
  updated_at: z.string(),
});
export const adminProgrammePlanListSchema = z.array(adminProgrammePlanSchema);
export type AdminProgrammePlan = z.infer<typeof adminProgrammePlanSchema>;

const programmeItemReplySchema = z.object({
  id: z.string(),
  day_id: z.string(),
  kind: z.enum(PROGRAMME_ITEM_KIND_VALUES),
  title: z.string(),
  detail: z.string(),
  minutes: z.number().int().nullable(),
  figure_key: z.string().nullable(),
  sort_order: z.number().int(),
});

/** admin_upsert_programme_day's reply: the stored day with its items in order. */
export const programmeDayReplySchema = z.object({
  id: z.string(),
  plan_id: z.string(),
  day_number: z.number().int(),
  title: z.string(),
  built_by: z.string().nullable(),
  items: z.array(programmeItemReplySchema),
});
export type ProgrammeDayReply = z.infer<typeof programmeDayReplySchema>;

/** One row of admin_list_enrolments, newest first. Stages are as stored. */
export const adminEnrolmentSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  client_name: text,
  trainer_id: z.string().nullable(),
  trainer_name: text,
  plan_id: z.string(),
  plan_title: z.string(),
  plan_weeks: z.number().int(),
  stage: z.enum(PROGRAMME_STAGE_VALUES),
  payment_status: z.string(),
  enrolled_at: z.string(),
  started_on: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  assessment: z
    .object({ booking_id: z.string(), start: z.string(), status: z.string() })
    .nullable(),
  checks_done: count,
});
export const adminEnrolmentListSchema = z.array(adminEnrolmentSchema);
export type AdminEnrolment = z.infer<typeof adminEnrolmentSchema>;

function parseReply<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new AppError("UNKNOWN", `The ${what} came back in a shape the panel does not know.`);
  }
  return parsed.data;
}

/** Every plan, active or not, in the app's order. */
export async function listProgrammePlans(client: AppSupabaseClient): Promise<AdminProgrammePlan[]> {
  const { data, error } = await client.rpc(RPC.listPlans);
  if (error) throw toAppError(error);
  return parseReply(adminProgrammePlanListSchema, data, "programme plans");
}

/**
 * Creates a plan (no id) or updates one (id). Keys left out keep their stored value; the
 * function refuses unknown keys. The payload uses the function's field names.
 */
export async function upsertProgrammePlan(
  client: AppSupabaseClient,
  payload: { [key: string]: Json },
): Promise<ProgrammePlanRow> {
  const { data, error } = await client.rpc(RPC.upsertPlan, { p: payload });
  if (error) throw toAppError(error);
  return parseReply(programmePlanRowSchema, data, "saved plan");
}

export async function setProgrammePlanActive(
  client: AppSupabaseClient,
  planId: string,
  active: boolean,
): Promise<ProgrammePlanRow> {
  const { data, error } = await client.rpc(RPC.setActive, { p_plan: planId, p_active: active });
  if (error) throw toAppError(error);
  return parseReply(programmePlanRowSchema, data, "saved plan");
}

/**
 * Creates or replaces one day with its items in the order sent. Items with an id are
 * updated; items left out are removed along with clients' ticks on them.
 */
export async function upsertProgrammeDay(
  client: AppSupabaseClient,
  payload: { [key: string]: Json },
): Promise<ProgrammeDayReply> {
  const { data, error } = await client.rpc(RPC.upsertDay, { p: payload });
  if (error) throw toAppError(error);
  return parseReply(programmeDayReplySchema, data, "saved day");
}

/** The authored days of one plan, by day number. */
export async function listProgrammeDays(
  client: AppSupabaseClient,
  planId: string,
): Promise<ProgrammeDayRow[]> {
  const { data, error } = await client
    .from(TABLE.days)
    .select("*")
    .eq("plan_id", planId)
    .order("day_number");
  if (error) throw toAppError(error);
  return data;
}

/** The items of one day, in the order the app shows them. */
export async function listProgrammeItems(
  client: AppSupabaseClient,
  dayId: string,
): Promise<ProgrammeItemRow[]> {
  const { data, error } = await client
    .from(TABLE.items)
    .select("*")
    .eq("day_id", dayId)
    .order("sort_order")
    .order("id");
  if (error) throw toAppError(error);
  return data;
}

export type OnlineTrainerOption = { id: string; name: string };

/**
 * Listed trainers who coach online, by name: the trainers admin_upsert_programme_plan accepts
 * as a plan's default trainer.
 */
export async function listOnlineTrainers(client: AppSupabaseClient): Promise<OnlineTrainerOption[]> {
  const { data, error } = await client
    .from(TABLE.listings)
    .select("trainer_id, display_name, modes")
    .contains("modes", ["online"])
    .order("display_name");
  if (error) throw toAppError(error);
  return data.map((row) => ({ id: row.trainer_id, name: row.display_name?.trim() || "Unnamed trainer" }));
}

/** Programme enrolments where the user is the client or the trainer, newest first. */
export async function listEnrolments(
  client: AppSupabaseClient,
  userId: string,
): Promise<AdminEnrolment[]> {
  const { data, error } = await client.rpc(RPC.listEnrolments, { p_user: userId });
  if (error) throw toAppError(error);
  return parseReply(adminEnrolmentListSchema, data, "programme enrolments");
}

/*
 * App usage aggregates for the analytics Usage tab: the five admin_usage_* readers from
 * 20261020120904_usage_analytics.sql. Each takes India dates [p_from, p_to], both included,
 * checks analytics.read and refuses ranges over 366 days with BRVAL. The jsonb is checked
 * with Zod before the panel renders it. Throws AppError.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";

const RPC = {
  overview: "admin_usage_overview",
  screens: "admin_usage_screens",
  funnel: "admin_usage_funnel",
  events: "admin_usage_events",
  versions: "admin_usage_versions",
} as const;

const count = z.number().int().nonnegative();
// Shares are fractions 0..1 rounded to four places; null when there was nothing to divide.
const fraction = z.number().min(0).max(1).nullable();
const milliseconds = z.number().nonnegative().nullable();

const rangeSchema = z.object({
  from: z.string(),
  to: z.string(),
  days: count,
  timezone: z.string(),
  generated_at: z.string(),
});

const usageDaySchema = z.object({
  day: z.string(),
  active_users: count,
  sessions: count,
  // Null on days that only survive in the daily rollup (raw rows older than 180 days).
  new_users: count.nullable(),
  returning_users: count.nullable(),
  source: z.enum(["raw", "daily"]),
});

const retentionCellSchema = z.object({
  offset: z.number().int().min(1).max(6),
  // Null for a week that has not begun yet.
  users: count.nullable(),
  share: fraction,
});

const cohortSchema = z.object({
  week: z.string(),
  users: count,
  retention: z.array(retentionCellSchema),
});

export const usageOverviewSchema = z.object({
  range: rangeSchema,
  totals: z.object({ active_users: count, sessions: count, new_users: count }),
  daily: z.array(usageDaySchema),
  monthly: z.array(z.object({ month: z.string(), active_users: count })),
  session_length: z.object({ count, median_ms: milliseconds, p90_ms: milliseconds }),
  retention_cohorts: z.array(cohortSchema),
});

const screenSchema = z.object({
  route: z.string(),
  views: count,
  unique_users: count,
  median_time_on_screen_ms: milliseconds,
  session_share: fraction,
});

export const usageScreensSchema = z.object({
  range: rangeSchema,
  sessions: count,
  screens: z.array(screenSchema),
});

export const FUNNEL_STEPS = ["discovery", "trainer_viewed", "booking_requested", "booking_confirmed"] as const;
export const FUNNEL_MODES = ["all", "home", "online"] as const;

const funnelStepSchema = z.object({
  step: z.enum(FUNNEL_STEPS),
  users: count,
  conversion: fraction,
});

const funnelGroupSchema = z.object({
  // The profile role at the time of the event, or "none" before one was picked.
  role: z.string(),
  mode: z.enum(FUNNEL_MODES),
  steps: z.array(funnelStepSchema),
});

export const usageFunnelSchema = z.object({
  range: rangeSchema,
  funnel: z.array(funnelGroupSchema),
});

const eventDaySchema = z.object({
  day: z.string(),
  total: count,
  by_name: z.record(z.string(), count),
});

const eventNameSchema = z.object({ name: z.string(), events: count, users: count });

export const usageEventsSchema = z.object({
  range: rangeSchema,
  by_day: z.array(eventDaySchema),
  by_name: z.array(eventNameSchema),
});

const versionRowSchema = z.object({
  app_version: z.string(),
  platform: z.string(),
  users: count,
  sessions: count,
  events: count,
});

export const usageVersionsSchema = z.object({
  range: rangeSchema,
  latest_version: z.string().nullable(),
  users: count,
  users_on_latest: count,
  latest_share: fraction,
  versions: z.array(versionRowSchema),
});

export type UsageOverview = z.infer<typeof usageOverviewSchema>;
export type UsageDay = z.infer<typeof usageDaySchema>;
export type RetentionCohort = z.infer<typeof cohortSchema>;
export type UsageScreens = z.infer<typeof usageScreensSchema>;
export type UsageScreen = z.infer<typeof screenSchema>;
export type UsageFunnel = z.infer<typeof usageFunnelSchema>;
export type FunnelGroup = z.infer<typeof funnelGroupSchema>;
export type FunnelStep = z.infer<typeof funnelStepSchema>;
export type FunnelStepKey = (typeof FUNNEL_STEPS)[number];
export type FunnelMode = (typeof FUNNEL_MODES)[number];
export type UsageEvents = z.infer<typeof usageEventsSchema>;
export type UsageEventDay = z.infer<typeof eventDaySchema>;
export type UsageEventName = z.infer<typeof eventNameSchema>;
export type UsageVersions = z.infer<typeof usageVersionsSchema>;
export type UsageVersionRow = z.infer<typeof versionRowSchema>;

type UsageRange = { from: string; to: string };

async function callUsage<T>(
  client: AppSupabaseClient,
  rpc: (typeof RPC)[keyof typeof RPC],
  schema: z.ZodType<T>,
  range: UsageRange,
): Promise<T> {
  const { data, error } = await client.rpc(rpc, { p_from: range.from, p_to: range.to });
  if (error) throw toAppError(error);
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new AppError("UNKNOWN", "The usage numbers came back in a shape the panel does not know.");
  }
  return parsed.data;
}

/** Daily active users, totals, monthly actives, session length and weekly retention cohorts. */
export function getUsageOverview(client: AppSupabaseClient, range: UsageRange): Promise<UsageOverview> {
  return callUsage(client, RPC.overview, usageOverviewSchema, range);
}

/** Per route: views, unique users, median time on screen, share of sessions; by views. */
export function getUsageScreens(client: AppSupabaseClient, range: UsageRange): Promise<UsageScreens> {
  return callUsage(client, RPC.screens, usageScreensSchema, range);
}

/** Discovery to confirmed booking, per role and mode (all, home, online). */
export function getUsageFunnel(client: AppSupabaseClient, range: UsageRange): Promise<UsageFunnel> {
  return callUsage(client, RPC.funnel, usageFunnelSchema, range);
}

/** Event counts per day and name, and unique users per name. */
export function getUsageEvents(client: AppSupabaseClient, range: UsageRange): Promise<UsageEvents> {
  return callUsage(client, RPC.events, usageEventsSchema, range);
}

/** Users and sessions by app version and platform, and the share on the latest version. */
export function getUsageVersions(client: AppSupabaseClient, range: UsageRange): Promise<UsageVersions> {
  return callUsage(client, RPC.versions, usageVersionsSchema, range);
}

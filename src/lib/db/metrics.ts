/*
 * The platform numbers for the analytics page: admin_metrics(p_from, p_to) from
 * 20261019000700, one call per range. India dates, both ends included; the function checks
 * metrics.read and refuses ranges over 366 days with BRVAL. The jsonb is checked with Zod
 * before the panel renders it. Throws AppError.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";

const RPC = { metrics: "admin_metrics" } as const;

const count = z.number().int().nonnegative();
// Postgres numerics come back as JSON numbers; rates are fractions 0..1, null with no data.
const fraction = z.number().min(0).max(1).nullable();
const decimal = z.number().nullable();

const signupDaySchema = z.object({
  day: z.string(),
  total: count,
  client: count,
  trainer: count,
  none: count,
});

const bookingDaySchema = z.object({
  day: z.string(),
  total: count,
  home: count,
  online: count,
  by_status: z.record(z.string(), count),
});

const cancellationSchema = z.object({ count, rate: fraction });

export const metricsSchema = z.object({
  range: z.object({
    from: z.string(),
    to: z.string(),
    days: count,
    timezone: z.string(),
    generated_at: z.string(),
  }),
  signups: z.object({
    total: count,
    by_role: z.object({ client: count, trainer: count, none: count }),
    by_day: z.array(signupDaySchema),
  }),
  applications: z.object({
    submitted: count,
    by_status: z.record(z.string(), count),
    decided: count,
    approved: count,
    rejected: count,
    approval_rate: fraction,
    median_days_to_decision: decimal,
  }),
  bookings: z.object({
    total: count,
    by_status: z.record(z.string(), count),
    by_mode: z.object({ home: count, online: count }),
    per_day: z.array(bookingDaySchema),
    settled: count,
    completion_rate: fraction,
    no_show_rate: fraction,
    cancellation_rate: fraction,
    cancellations_by: z.object({
      client: cancellationSchema,
      trainer: cancellationSchema,
      admin: cancellationSchema,
      unknown: cancellationSchema,
    }),
  }),
  trainers: z.object({ active: count, listed: count }),
  clients: z.object({ active: count, booked: count }),
  reviews: z.object({ count, hidden: count, average: decimal }),
  support: z.object({ opened: count, resolved: count, median_hours_to_resolve: decimal }),
  top_cities: z.array(z.object({ city: z.string(), bookings: count })),
});

export type PlatformMetrics = z.infer<typeof metricsSchema>;
export type SignupDay = z.infer<typeof signupDaySchema>;
export type BookingDay = z.infer<typeof bookingDaySchema>;

/** Numbers for India dates `from` to `to` ("YYYY-MM-DD"), both included. */
export async function getMetrics(
  client: AppSupabaseClient,
  range: { from: string; to: string },
): Promise<PlatformMetrics> {
  const { data, error } = await client.rpc(RPC.metrics, { p_from: range.from, p_to: range.to });
  if (error) throw toAppError(error);
  const parsed = metricsSchema.safeParse(data);
  if (!parsed.success) {
    throw new AppError("UNKNOWN", "The metrics came back in a shape the panel does not know.");
  }
  return parsed.data;
}

/*
 * Server loader for the analytics page: one admin_metrics call per range (metrics.read).
 * A range the server would refuse is reported without calling it.
 */
import { getMetrics, type PlatformMetrics } from "@/lib/db/metrics";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { rangeProblem, type AnalyticsRange } from "@/features/analytics/schemas";

export type MetricsResult = { ok: true; metrics: PlatformMetrics } | { ok: false; error: string };

export async function loadMetrics(client: AppSupabaseClient, range: AnalyticsRange): Promise<MetricsResult> {
  const problem = rangeProblem(range);
  if (problem) return { ok: false, error: problem };
  try {
    return { ok: true, metrics: await getMetrics(client, { from: range.from, to: range.to }) };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

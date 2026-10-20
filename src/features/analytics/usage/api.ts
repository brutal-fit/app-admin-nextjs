/*
 * Server loader for the Usage tab: the five admin_usage_* readers for one range, called in
 * parallel (analytics.read). A range the server would refuse is reported without calling.
 */
import {
  getUsageEvents,
  getUsageFunnel,
  getUsageOverview,
  getUsageScreens,
  getUsageVersions,
  type UsageEvents,
  type UsageFunnel,
  type UsageOverview,
  type UsageScreens,
  type UsageVersions,
} from "@/lib/db/usage";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { rangeProblem, type AnalyticsRange } from "@/features/analytics/schemas";

export type UsageData = {
  overview: UsageOverview;
  screens: UsageScreens;
  funnel: UsageFunnel;
  events: UsageEvents;
  versions: UsageVersions;
};

export type UsageResult = { ok: true; usage: UsageData } | { ok: false; error: string };

export async function loadUsage(
  client: AppSupabaseClient,
  range: Pick<AnalyticsRange, "from" | "to">,
): Promise<UsageResult> {
  const problem = rangeProblem(range);
  if (problem) return { ok: false, error: problem };
  const dates = { from: range.from, to: range.to };
  try {
    const [overview, screens, funnel, events, versions] = await Promise.all([
      getUsageOverview(client, dates),
      getUsageScreens(client, dates),
      getUsageFunnel(client, dates),
      getUsageEvents(client, dates),
      getUsageVersions(client, dates),
    ]);
    return { ok: true, usage: { overview, screens, funnel, events, versions } };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

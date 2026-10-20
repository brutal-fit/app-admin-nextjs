/*
 * The analytics range as it lives in the URL: a preset (`?days=7|30|90`) or a custom
 * `?from=&to=` in India dates. Pure, so the round trip is testable.
 */
import { isIsoDate } from "@/lib/utils/time";

export const RANGE_PRESETS = [7, 30, 90] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];
export const DEFAULT_PRESET: RangePreset = 30;
/** admin_metrics refuses longer ranges. */
export const RANGE_MAX_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;

export type AnalyticsRange = {
  /** India dates "YYYY-MM-DD", both included. */
  from: string;
  to: string;
  /** The preset the range came from; null for a custom range. */
  preset: RangePreset | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `date` moved by `days` (negative goes back). */
export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Days from `from` to `to`, both included. */
export function rangeDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

/** The last `days` days ending today. */
export function presetRange(preset: RangePreset, today: string): AnalyticsRange {
  return { from: shiftDate(today, -(preset - 1)), to: today, preset };
}

function isPreset(value: number): value is RangePreset {
  return (RANGE_PRESETS as readonly number[]).includes(value);
}

/**
 * Reads the range from the URL. A custom range needs both dates; anything else falls back
 * to the default preset. An inverted or too-long custom range is kept as given, so the page
 * can say what is wrong instead of silently showing another range.
 */
export function parseAnalyticsRange(params: SearchParams, today: string): AnalyticsRange {
  const from = first(params.from);
  const to = first(params.to);
  if (from && to && isIsoDate(from) && isIsoDate(to)) return { from, to, preset: null };
  const days = Number(first(params.days));
  return presetRange(isPreset(days) ? days : DEFAULT_PRESET, today);
}

/** Why the server would refuse the range, or null when it is fine. */
export function rangeProblem(range: Pick<AnalyticsRange, "from" | "to">): string | null {
  if (range.to < range.from) return "The end date is before the start date. Change one of them.";
  if (rangeDays(range.from, range.to) > RANGE_MAX_DAYS) {
    return `Choose a range of ${RANGE_MAX_DAYS} days or less.`;
  }
  return null;
}

/**
 * "business" reads admin_metrics (metrics.read, the page's own gate); "usage" reads the
 * admin_usage_* functions and exists only for sessions holding analytics.read.
 */
export const ANALYTICS_TABS = ["business", "usage"] as const;
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];
export const DEFAULT_TAB: AnalyticsTab = "business";

export const ANALYTICS_TAB_LABELS: Record<AnalyticsTab, string> = {
  business: "Business",
  usage: "Usage",
};

/** The tabs a session may open, in display order. */
export function analyticsTabs(canReadUsage: boolean): AnalyticsTab[] {
  return canReadUsage ? [...ANALYTICS_TABS] : [DEFAULT_TAB];
}

/** `?tab=usage` opens the Usage tab only when the session may read it; anything else is Business. */
export function parseAnalyticsTab(params: SearchParams, canReadUsage: boolean): AnalyticsTab {
  const tab = first(params.tab);
  return tab === "usage" && canReadUsage ? "usage" : DEFAULT_TAB;
}

export function analyticsHref(
  range: { preset: RangePreset } | { from: string; to: string },
  tab: AnalyticsTab = DEFAULT_TAB,
): string {
  const query: string[] = [];
  if ("preset" in range) {
    if (range.preset !== DEFAULT_PRESET) query.push(`days=${range.preset}`);
  } else {
    query.push(`from=${range.from}`, `to=${range.to}`);
  }
  if (tab !== DEFAULT_TAB) query.push(`tab=${tab}`);
  return query.length > 0 ? `/analytics?${query.join("&")}` : "/analytics";
}

/** The same range as a link target, keeping a preset as a preset. */
export function rangeHrefInput(range: AnalyticsRange): { preset: RangePreset } | { from: string; to: string } {
  return range.preset !== null ? { preset: range.preset } : { from: range.from, to: range.to };
}

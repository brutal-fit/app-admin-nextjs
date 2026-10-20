/*
 * Pure helpers for the Usage tab: series and slots for the day charts, funnel conversion,
 * retention shading and labels. Number formatting itself lives in ../format.ts.
 */
import {
  formatCount,
  formatDay,
  type BarDatum,
  type Series,
} from "@/features/analytics/format";
import type { DayStack } from "@/features/analytics/components/stacked-day-chart";
import type {
  FunnelGroup,
  FunnelMode,
  FunnelStepKey,
  RetentionCohort,
  UsageDay,
  UsageEvents,
  UsageOverview,
} from "@/lib/db/usage";

/** Every empty usage section says this: the app starts sending events with its tracker. */
export const USAGE_EMPTY = "No usage data in this range yet.";

/** The screens table shows this many routes until "Show all". */
export const SCREENS_TOP = 20;

/**
 * Daily active users split new and returning. Days that survive only in the daily rollup
 * (raw rows purged after 180 days) carry no split, so they get their own series instead of
 * being guessed into one of the two.
 */
export const ACTIVE_USER_SERIES: readonly Series<UsageDay>[] = [
  { key: "new", label: "New", slot: 1, value: (row) => row.new_users ?? 0 },
  { key: "returning", label: "Returning", slot: 2, value: (row) => row.returning_users ?? 0 },
  {
    key: "unsplit",
    label: "Not split (older rollup)",
    slot: 3,
    value: (row) => (row.new_users === null ? row.active_users : 0),
  },
];

/** Active users on `today` from the daily series, or null when the range does not include it. */
export function todayActiveUsers(overview: UsageOverview, today: string): number | null {
  return overview.daily.find((row) => row.day === today)?.active_users ?? null;
}

/** The last calendar month the range touches, with its active users. */
export function latestMonth(overview: UsageOverview): { month: string; active_users: number } | null {
  return overview.monthly.at(-1) ?? null;
}

/** "Oct 2026" for "2026-10". */
export function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  });
}

/** True when the range holds no events at all, raw or rolled up. */
export function isEmptyUsage(overview: UsageOverview, events: UsageEvents): boolean {
  return (
    overview.totals.active_users === 0 &&
    overview.daily.every((row) => row.active_users === 0) &&
    events.by_day.every((row) => row.total === 0)
  );
}

export const FUNNEL_STEP_LABELS: Record<FunnelStepKey, string> = {
  discovery: "Searched or browsed trainers",
  trainer_viewed: "Viewed a trainer",
  booking_requested: "Requested a booking",
  booking_confirmed: "Booking confirmed",
};

export const FUNNEL_MODE_LABELS: Record<FunnelMode, string> = {
  all: "All modes",
  home: "At home",
  online: "Online",
};

const ROLE_LABELS: Readonly<Record<string, string>> = {
  client: "Clients",
  trainer: "Trainers",
  none: "No role yet",
};

const ROLE_ORDER = ["client", "trainer", "none"];

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** Share of the previous step that reached this one; null when the previous step is empty. */
export function stepConversion(previous: number, current: number): number | null {
  return previous > 0 ? current / previous : null;
}

export type FunnelBar = {
  key: FunnelStepKey;
  label: string;
  users: number;
  /** Of the step before; null on the first step and after an empty step. */
  conversion: number | null;
  /** Bar length as a fraction of the first step (the widest). */
  width: number;
};

/** The four steps of one role and mode, with conversion between neighbours. */
export function funnelBars(group: FunnelGroup): FunnelBar[] {
  const first = group.steps[0]?.users ?? 0;
  return group.steps.map((step, index) => {
    const previous = index > 0 ? group.steps[index - 1] : undefined;
    return {
      key: step.step,
      label: FUNNEL_STEP_LABELS[step.step],
      users: step.users,
      conversion: previous ? stepConversion(previous.users, step.users) : null,
      width: first > 0 ? Math.min(1, step.users / first) : 0,
    };
  });
}

/** First step to last: the share of discovering users who ended with a confirmed booking. */
export function overallConversion(group: FunnelGroup): number | null {
  const first = group.steps[0]?.users ?? 0;
  const last = group.steps.at(-1)?.users ?? 0;
  return stepConversion(first, last);
}

/** Funnel groups by role (clients first), each with its modes in all, home, online order. */
export function funnelByRole(groups: readonly FunnelGroup[]): { role: string; groups: FunnelGroup[] }[] {
  const roles = [...new Set(groups.map((group) => group.role))].sort((a, b) => {
    const ai = ROLE_ORDER.indexOf(a);
    const bi = ROLE_ORDER.indexOf(b);
    return (ai === -1 ? ROLE_ORDER.length : ai) - (bi === -1 ? ROLE_ORDER.length : bi) || a.localeCompare(b);
  });
  const modeOrder: readonly FunnelMode[] = ["all", "home", "online"];
  return roles.map((role) => ({
    role,
    groups: groups
      .filter((group) => group.role === role)
      .sort((a, b) => modeOrder.indexOf(a.mode) - modeOrder.indexOf(b.mode)),
  }));
}

export const RETENTION_OFFSETS = [1, 2, 3, 4, 5, 6] as const;

// The accent mix range for retention cells: light enough to read 0.1% apart from empty, and
// capped so the foreground text keeps 4.5:1 on the darkest cell (chart-1 at 70% over card).
const SHADE_MIN = 12;
const SHADE_MAX = 70;

/**
 * How strongly a retention cell is shaded, as the percentage of the chart colour mixed into
 * the card: null for a week not begun, 0 for nobody back, then 12 to 70 by share.
 */
export function retentionShade(share: number | null): number | null {
  if (share === null) return null;
  if (share <= 0) return 0;
  const clamped = Math.min(1, share);
  return Math.round(SHADE_MIN + clamped * (SHADE_MAX - SHADE_MIN));
}

/** The cell for week W+offset of a cohort, or undefined when the server sent none. */
export function retentionCell(cohort: RetentionCohort, offset: number) {
  return cohort.retention.find((cell) => cell.offset === offset);
}

/** "booking_requested" -> "Booking requested". */
export function eventLabel(name: string): string {
  const words = name.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Events with at least one count in the range, by count; the table keeps the zeros. */
export function eventBars(events: UsageEvents): BarDatum[] {
  return events.by_name
    .filter((row) => row.events > 0)
    .map((row) => ({
      key: row.name,
      label: eventLabel(row.name),
      value: row.events,
      display: `${formatCount(row.events)} (${formatCount(row.users)} ${row.users === 1 ? "user" : "users"})`,
    }));
}

/** Names with at least one event in the range, in the server's order (most first). */
export function activeEventNames(events: UsageEvents): string[] {
  return events.by_name.filter((row) => row.events > 0).map((row) => row.name);
}

export const ALL_EVENTS = "all";

/** One value per day for the chosen event, or every event's total for ALL_EVENTS. */
export function eventDays(events: UsageEvents, name: string): DayStack[] {
  return events.by_day.map((row) => ({
    day: row.day,
    values: [name === ALL_EVENTS ? row.total : (row.by_name[name] ?? 0)],
  }));
}

const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  android: "Android",
  ios: "iOS",
  web: "Web",
};

export function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

/** "Week of 12 Oct" for a cohort's Monday. */
export function cohortLabel(week: string): string {
  return `Week of ${formatDay(week)}`;
}

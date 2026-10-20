import { describe, expect, it } from "vitest";
import {
  ALL_EVENTS,
  eventBars,
  eventDays,
  funnelBars,
  funnelByRole,
  isEmptyUsage,
  overallConversion,
  retentionShade,
  stepConversion,
  todayActiveUsers,
} from "@/features/analytics/usage/format";

const step = (s: string, users: number) => ({ step: s, users, conversion: null }) as never;
const group = (role: string, mode: string, users: number[]) =>
  ({
    role,
    mode,
    steps: ["discovery", "trainer_viewed", "booking_requested", "booking_confirmed"].map((s, i) => step(s, users[i])),
  }) as never;

describe("funnel conversion", () => {
  it("divides by the previous step and is null after an empty step", () => {
    expect(stepConversion(10, 5)).toBe(0.5);
    expect(stepConversion(0, 0)).toBeNull();
  });

  it("builds four bars with step conversion and width against the first", () => {
    const bars = funnelBars(group("client", "all", [10, 5, 2, 1]));
    expect(bars.map((b) => b.users)).toEqual([10, 5, 2, 1]);
    expect(bars.map((b) => b.conversion)).toEqual([null, 0.5, 0.4, 0.5]);
    expect(bars.map((b) => b.width)).toEqual([1, 0.5, 0.2, 0.1]);
  });

  it("handles an all-zero funnel", () => {
    const bars = funnelBars(group("client", "all", [0, 0, 0, 0]));
    expect(bars.every((b) => b.conversion === null && b.width === 0)).toBe(true);
    expect(overallConversion(group("client", "all", [0, 0, 0, 0]))).toBeNull();
  });

  it("computes first-to-last conversion", () => {
    expect(overallConversion(group("client", "all", [10, 5, 2, 1]))).toBe(0.1);
  });

  it("orders roles clients first and modes all, home, online", () => {
    const rows = funnelByRole([
      group("none", "all", [1, 0, 0, 0]),
      group("trainer", "all", [1, 0, 0, 0]),
      group("client", "online", [1, 0, 0, 0]),
      group("client", "all", [1, 0, 0, 0]),
      group("client", "home", [1, 0, 0, 0]),
    ]);
    expect(rows.map((r) => r.role)).toEqual(["client", "trainer", "none"]);
    expect(rows[0].groups.map((g) => g.mode)).toEqual(["all", "home", "online"]);
  });
});

describe("retentionShade", () => {
  it("is null for a week not begun and 0 for nobody back", () => {
    expect(retentionShade(null)).toBeNull();
    expect(retentionShade(0)).toBe(0);
  });

  it("scales from 12 to 70 and clamps above 1", () => {
    expect(retentionShade(0.001)).toBe(12);
    expect(retentionShade(0.5)).toBe(41);
    expect(retentionShade(1)).toBe(70);
    expect(retentionShade(2)).toBe(70);
  });

  it("never decreases as the share grows", () => {
    let last = 0;
    for (let share = 0.01; share <= 1; share += 0.01) {
      const shade = retentionShade(share) as number;
      expect(shade).toBeGreaterThanOrEqual(last);
      last = shade;
    }
  });
});

describe("overview and events helpers", () => {
  const overview = {
    totals: { active_users: 5, sessions: 9, new_users: 2 },
    daily: [{ day: "2026-10-19", active_users: 5, sessions: 9, new_users: 2, returning_users: 3, source: "raw" }],
    monthly: [],
  } as never;
  const noEvents = { by_day: [{ day: "2026-10-19", total: 0, by_name: {} }], by_name: [] } as never;

  it("finds today's active users or null when out of range", () => {
    expect(todayActiveUsers(overview, "2026-10-19")).toBe(5);
    expect(todayActiveUsers(overview, "2026-10-20")).toBeNull();
  });

  it("detects an empty range", () => {
    const empty = { totals: { active_users: 0 }, daily: [], monthly: [] } as never;
    expect(isEmptyUsage(empty, noEvents)).toBe(true);
    expect(isEmptyUsage(overview, noEvents)).toBe(false);
  });

  it("drops zero-count events from the bars and pluralises users", () => {
    const events = {
      by_day: [],
      by_name: [
        { name: "booking_requested", events: 1200, users: 1 },
        { name: "search", events: 0, users: 0 },
      ],
    } as never;
    const bars = eventBars(events);
    expect(bars).toHaveLength(1);
    expect(bars[0].label).toBe("Booking requested");
    expect(bars[0].display).toContain("1 user");
    expect(bars[0].display).not.toContain("users");
  });

  it("picks one event's daily counts or the total", () => {
    const events = { by_day: [{ day: "2026-10-19", total: 7, by_name: { a: 3 } }], by_name: [] } as never;
    expect(eventDays(events, "a")[0].values).toEqual([3]);
    expect(eventDays(events, "missing")[0].values).toEqual([0]);
    expect(eventDays(events, ALL_EVENTS)[0].values).toEqual([7]);
  });
});

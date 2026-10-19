import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRESET,
  RANGE_MAX_DAYS,
  analyticsHref,
  parseAnalyticsRange,
  presetRange,
  rangeDays,
  rangeProblem,
  shiftDate,
} from "@/features/analytics/schemas";

const TODAY = "2026-10-19";

describe("range arithmetic", () => {
  it("shifts dates across month ends", () => {
    expect(shiftDate("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftDate("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("counts both ends", () => {
    expect(rangeDays("2026-10-19", "2026-10-19")).toBe(1);
    expect(rangeDays("2026-10-13", "2026-10-19")).toBe(7);
  });

  it("builds presets ending today", () => {
    expect(presetRange(7, TODAY)).toEqual({ from: "2026-10-13", to: TODAY, preset: 7 });
    expect(rangeDays(presetRange(90, TODAY).from, TODAY)).toBe(90);
  });
});

describe("parseAnalyticsRange", () => {
  it("defaults to 30 days", () => {
    const range = parseAnalyticsRange({}, TODAY);
    expect(range.preset).toBe(DEFAULT_PRESET);
    expect(rangeDays(range.from, range.to)).toBe(30);
  });

  it("reads the presets", () => {
    expect(parseAnalyticsRange({ days: "7" }, TODAY).preset).toBe(7);
    expect(parseAnalyticsRange({ days: "90" }, TODAY).preset).toBe(90);
  });

  it("falls back for an unknown preset", () => {
    expect(parseAnalyticsRange({ days: "15" }, TODAY).preset).toBe(30);
  });

  it("reads a custom range and prefers it over days", () => {
    expect(parseAnalyticsRange({ from: "2026-09-01", to: "2026-09-10", days: "7" }, TODAY)).toEqual({
      from: "2026-09-01",
      to: "2026-09-10",
      preset: null,
    });
  });

  it("ignores a half or invalid custom range", () => {
    expect(parseAnalyticsRange({ from: "2026-09-01" }, TODAY).preset).toBe(30);
    expect(parseAnalyticsRange({ from: "bad", to: "2026-09-10" }, TODAY).preset).toBe(30);
  });

  it("keeps an inverted range as given", () => {
    const range = parseAnalyticsRange({ from: "2026-09-10", to: "2026-09-01" }, TODAY);
    expect(range.from).toBe("2026-09-10");
    expect(rangeProblem(range)).toMatch(/before the start/);
  });
});

describe("rangeProblem", () => {
  it("accepts a valid range up to the limit", () => {
    expect(rangeProblem({ from: "2026-01-01", to: "2026-01-01" })).toBeNull();
    const to = shiftDate("2026-01-01", RANGE_MAX_DAYS - 1);
    expect(rangeProblem({ from: "2026-01-01", to })).toBeNull();
  });

  it("refuses a range over 366 days", () => {
    const to = shiftDate("2026-01-01", RANGE_MAX_DAYS);
    expect(rangeProblem({ from: "2026-01-01", to })).toContain("366");
  });
});

describe("analyticsHref", () => {
  it("keeps the default preset bare", () => {
    expect(analyticsHref({ preset: 30 })).toBe("/analytics");
    expect(analyticsHref({ preset: 7 })).toBe("/analytics?days=7");
  });

  it("round-trips a custom range", () => {
    const href = analyticsHref({ from: "2026-09-01", to: "2026-09-10" });
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseAnalyticsRange(params, TODAY)).toMatchObject({ from: "2026-09-01", to: "2026-09-10", preset: null });
  });
});

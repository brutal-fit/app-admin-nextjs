import { describe, expect, it } from "vitest";
import {
  BOOKING_SERIES,
  SIGNUP_SERIES,
  applicationFunnel,
  applicationStatusRows,
  bookingStatusCount,
  cityBars,
  countAxis,
  formatDays,
  formatHours,
  formatPercent,
  formatRatingAverage,
  isEmptyRange,
  rateBars,
  slotColor,
} from "@/features/analytics/format";
import { metricsFixture } from "@/lib/db/__tests__/metrics-fixture";

describe("number formats", () => {
  it("formats percents and missing data", () => {
    expect(formatPercent(0.8333)).toBe("83%");
    expect(formatPercent(null)).toBe("No data");
  });

  it("formats hours up to two days, then days", () => {
    expect(formatHours(1.5)).toBe("1.5 h");
    expect(formatHours(72)).toBe("3.0 days");
    expect(formatHours(null)).toBe("No data");
  });

  it("formats days and ratings", () => {
    expect(formatDays(1)).toBe("1.0 day");
    expect(formatDays(2.5)).toBe("2.5 days");
    expect(formatDays(null)).toBe("No data");
    expect(formatRatingAverage(4.5)).toBe("4.50 of 5");
    expect(formatRatingAverage(null)).toBe("No data");
  });

  it("maps slots to chart variables", () => {
    expect(slotColor(2)).toBe("var(--chart-2)");
  });
});

describe("series", () => {
  it("reads sign-ups by role", () => {
    const day = metricsFixture().signups.by_day[0]!;
    expect(SIGNUP_SERIES.map((s) => s.value(day))).toEqual([3, 1, 1]);
  });

  it("folds eight booking statuses into four groups without losing any", () => {
    const day = metricsFixture().bookings.per_day[0]!;
    const values = BOOKING_SERIES.map((s) => s.value(day));
    expect(values).toEqual([2, 6, 2, 0]);
    expect(values.reduce((a, b) => a + b, 0)).toBe(day.total);
    expect(bookingStatusCount(day, "no_show")).toBe(0);
  });

  it("keeps each series in a distinct slot", () => {
    const slots = BOOKING_SERIES.map((s) => s.slot);
    expect(new Set(slots).size).toBe(slots.length);
  });
});

describe("sections", () => {
  const metrics = metricsFixture();

  it("builds the application funnel", () => {
    expect(applicationFunnel(metrics).map((d) => [d.key, d.value])).toEqual([
      ["submitted", 4],
      ["decided", 3],
      ["approved", 2],
      ["rejected", 1],
    ]);
  });

  it("lists application statuses with zero for missing ones", () => {
    const rows = applicationStatusRows(metrics);
    expect(rows).toHaveLength(6);
    expect(rows.reduce((sum, r) => sum + r.count, 0)).toBe(4);
  });

  it("scales rates to 0..100 and drops rates without data", () => {
    const bars = rateBars(metrics);
    const completion = bars.find((b) => b.key === "completion")!;
    expect(completion.value).toBe(75);
    expect(completion.display).toBe("75%");
    expect(bars.find((b) => b.key === "cancelled_admin")).toBeUndefined();
    expect(bars.find((b) => b.key === "cancelled_client")?.display).toBe("13%");
  });

  it("lists top cities", () => {
    expect(cityBars(metrics)).toEqual([
      { key: "Bengaluru", label: "Bengaluru", value: 7, display: "7" },
      { key: "Mumbai", label: "Mumbai", value: 3, display: "3" },
    ]);
  });
});

describe("isEmptyRange", () => {
  it("is false with data", () => {
    expect(isEmptyRange(metricsFixture())).toBe(false);
  });

  it("is true when nothing happened", () => {
    const m = metricsFixture();
    m.signups.total = 0;
    m.bookings.total = 0;
    m.applications.submitted = 0;
    m.applications.decided = 0;
    m.reviews.count = 0;
    m.support.opened = 0;
    m.support.resolved = 0;
    expect(isEmptyRange(m)).toBe(true);
  });
});

describe("countAxis", () => {
  it("gives a unit axis for zero", () => {
    expect(countAxis(0)).toEqual({ top: 1, ticks: [0, 1] });
  });

  it("rounds up to 1, 2 or 5 times a power of ten", () => {
    expect(countAxis(7)).toEqual({ top: 10, ticks: [0, 5, 10] });
    expect(countAxis(13).top).toBe(20);
    expect(countAxis(21).top).toBe(50);
    expect(countAxis(100).top).toBe(100);
  });

  it("omits a fractional midpoint", () => {
    expect(countAxis(1)).toEqual({ top: 1, ticks: [0, 1] });
  });
});

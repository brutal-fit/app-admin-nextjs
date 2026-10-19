import type { PlatformMetrics } from "@/lib/db/metrics";

const noCancel = { count: 0, rate: null };

export function metricsFixture(overrides: Partial<PlatformMetrics> = {}): PlatformMetrics {
  return {
    range: { from: "2026-10-01", to: "2026-10-07", days: 7, timezone: "Asia/Kolkata", generated_at: "2026-10-08T00:00:00Z" },
    signups: {
      total: 5,
      by_role: { client: 3, trainer: 1, none: 1 },
      by_day: [{ day: "2026-10-01", total: 5, client: 3, trainer: 1, none: 1 }],
    },
    applications: {
      submitted: 4,
      by_status: { submitted: 1, approved: 2, rejected: 1 },
      decided: 3,
      approved: 2,
      rejected: 1,
      approval_rate: 2 / 3,
      median_days_to_decision: 1.5,
    },
    bookings: {
      total: 10,
      by_status: { completed: 6, cancelled: 2, confirmed: 2 },
      by_mode: { home: 6, online: 4 },
      per_day: [
        {
          day: "2026-10-01",
          total: 10,
          home: 6,
          online: 4,
          by_status: { completed: 6, cancelled: 2, confirmed: 1, requested: 1 },
        },
      ],
      settled: 8,
      completion_rate: 0.75,
      no_show_rate: 0,
      cancellation_rate: 0.25,
      cancellations_by: { client: { count: 1, rate: 0.125 }, trainer: { count: 1, rate: 0.125 }, admin: noCancel, unknown: noCancel },
    },
    trainers: { active: 3, listed: 2 },
    clients: { active: 4, booked: 3 },
    reviews: { count: 2, hidden: 0, average: 4.5 },
    support: { opened: 2, resolved: 1, median_hours_to_resolve: 5 },
    top_cities: [{ city: "Bengaluru", bookings: 7 }, { city: "Mumbai", bookings: 3 }],
    ...overrides,
  };
}

import { describe, expect, it, vi } from "vitest";
import {
  getUsageEvents,
  getUsageFunnel,
  getUsageOverview,
  getUsageScreens,
  getUsageVersions,
} from "@/lib/db/usage";

const range = { from: "2026-10-01", to: "2026-10-20", days: 20, timezone: "Asia/Kolkata", generated_at: "2026-10-20T10:00:00Z" };

const overview = {
  range,
  totals: { active_users: 12, sessions: 30, new_users: 4 },
  daily: [
    { day: "2026-10-19", active_users: 5, sessions: 9, new_users: 2, returning_users: 3, source: "raw" },
    { day: "2026-04-01", active_users: 3, sessions: 4, new_users: null, returning_users: null, source: "daily" },
  ],
  monthly: [{ month: "2026-10", active_users: 12 }],
  session_length: { count: 30, median_ms: 95000, p90_ms: null },
  retention_cohorts: [
    {
      week: "2026-10-12",
      users: 10,
      retention: [
        { offset: 1, users: 4, share: 0.4 },
        { offset: 2, users: null, share: null },
      ],
    },
  ],
};
const screens = {
  range,
  sessions: 30,
  screens: [{ route: "/home", views: 50, unique_users: 12, median_time_on_screen_ms: null, session_share: 0.8 }],
};
const funnel = {
  range,
  funnel: [
    {
      role: "client",
      mode: "all",
      steps: [
        { step: "discovery", users: 10, conversion: null },
        { step: "trainer_viewed", users: 5, conversion: 0.5 },
        { step: "booking_requested", users: 2, conversion: 0.4 },
        { step: "booking_confirmed", users: 1, conversion: 0.5 },
      ],
    },
  ],
};
const events = {
  range,
  by_day: [{ day: "2026-10-19", total: 3, by_name: { booking_requested: 3 } }],
  by_name: [{ name: "booking_requested", events: 3, users: 2 }],
};
const versions = {
  range,
  latest_version: "1.2.0",
  users: 10,
  users_on_latest: 6,
  latest_share: 0.6,
  versions: [{ app_version: "1.2.0", platform: "android", users: 6, sessions: 12, events: 40 }],
};

function clientWith(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { rpc, client: { rpc } as never };
}

const dates = { from: "2026-10-01", to: "2026-10-20" };
const args = { p_from: dates.from, p_to: dates.to };

describe("usage readers", () => {
  const cases = [
    ["admin_usage_overview", getUsageOverview, overview],
    ["admin_usage_screens", getUsageScreens, screens],
    ["admin_usage_funnel", getUsageFunnel, funnel],
    ["admin_usage_events", getUsageEvents, events],
    ["admin_usage_versions", getUsageVersions, versions],
  ] as const;

  it.each(cases)("%s parses a fixture payload and sends the dates", async (name, fn, payload) => {
    const { rpc, client } = clientWith(payload);
    await expect(fn(client, dates)).resolves.toEqual(payload);
    expect(rpc).toHaveBeenCalledWith(name, args);
  });

  it.each(cases)("%s rejects a payload in the wrong shape", async (_name, fn) => {
    const { client } = clientWith({ nope: true });
    await expect(fn(client, dates)).rejects.toMatchObject({ message: expect.stringContaining("shape") });
  });

  it.each(cases)("%s throws the mapped error when the call fails", async (_name, fn) => {
    const { client } = clientWith(null, { code: "42501", message: "denied" });
    await expect(fn(client, dates)).rejects.toBeDefined();
  });

  it("rejects a share above 1 and an unknown funnel step", async () => {
    const badShare = { ...versions, latest_share: 1.5 };
    await expect(getUsageVersions(clientWith(badShare).client, dates)).rejects.toBeDefined();
    const badStep = { ...funnel, funnel: [{ ...funnel.funnel[0], steps: [{ step: "other", users: 1, conversion: null }] }] };
    await expect(getUsageFunnel(clientWith(badStep).client, dates)).rejects.toBeDefined();
  });
});

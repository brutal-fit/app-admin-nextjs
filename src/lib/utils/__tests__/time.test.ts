import { describe, expect, it } from "vitest";
import { daysAgoIso, formatRelativeTime, formatWaiting, istDayRange, istHour } from "@/lib/utils/time";

const NOW = Date.parse("2026-10-19T10:00:00Z");

describe("time helpers", () => {
  it("daysAgoIso subtracts whole days", () => {
    expect(daysAgoIso(7, NOW)).toBe("2026-10-12T10:00:00.000Z");
  });

  it("istDayRange spans the India day", () => {
    // 10:00 UTC is 15:30 IST on the 19th; IST midnight is 18:30 UTC on the 18th.
    expect(istDayRange(NOW)).toEqual({ from: "2026-10-18T18:30:00.000Z", to: "2026-10-19T18:30:00.000Z" });
  });

  it("istDayRange rolls over after IST midnight", () => {
    const now = Date.parse("2026-10-19T19:00:00Z");
    expect(istDayRange(now).from).toBe("2026-10-19T18:30:00.000Z");
  });

  it("istHour reads India time", () => {
    expect(istHour(NOW)).toBe(15);
  });

  it("formatRelativeTime buckets", () => {
    const ago = (ms: number) => new Date(NOW - ms).toISOString();
    expect(formatRelativeTime(ago(10_000), NOW)).toBe("just now");
    expect(formatRelativeTime(ago(5 * 60_000), NOW)).toBe("5 min ago");
    expect(formatRelativeTime(ago(3 * 3600_000), NOW)).toBe("3 h ago");
    expect(formatRelativeTime(ago(30 * 3600_000), NOW)).toBe("yesterday");
    expect(formatRelativeTime(ago(4 * 86400_000), NOW)).toBe("4 days ago");
    expect(formatRelativeTime(ago(10 * 86400_000), NOW)).toMatch(/2026/);
  });

  it("formatRelativeTime never goes negative for future timestamps", () => {
    expect(formatRelativeTime(new Date(NOW + 60_000).toISOString(), NOW)).toBe("just now");
  });

  it("formatWaiting pluralises", () => {
    const ago = (ms: number) => new Date(NOW - ms).toISOString();
    expect(formatWaiting(ago(60_000), NOW)).toBe("less than an hour");
    expect(formatWaiting(ago(3600_000), NOW)).toBe("1 hour");
    expect(formatWaiting(ago(5 * 3600_000), NOW)).toBe("5 hours");
    expect(formatWaiting(ago(86400_000), NOW)).toBe("1 day");
    expect(formatWaiting(ago(3 * 86400_000), NOW)).toBe("3 days");
  });
});

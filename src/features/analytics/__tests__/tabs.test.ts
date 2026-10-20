import { describe, expect, it } from "vitest";
import { analyticsHref, analyticsTabs, parseAnalyticsTab } from "@/features/analytics/schemas";

describe("analyticsTabs", () => {
  it("shows both tabs with analytics.read", () => {
    expect(analyticsTabs(true)).toEqual(["business", "usage"]);
  });

  it("hides the Usage tab without analytics.read", () => {
    expect(analyticsTabs(false)).toEqual(["business"]);
  });
});

describe("parseAnalyticsTab", () => {
  it("opens usage only for a session that may read it", () => {
    expect(parseAnalyticsTab({ tab: "usage" }, true)).toBe("usage");
    expect(parseAnalyticsTab({ tab: "usage" }, false)).toBe("business");
  });

  it("falls back to business for missing or unknown tabs", () => {
    expect(parseAnalyticsTab({}, true)).toBe("business");
    expect(parseAnalyticsTab({ tab: "nope" }, true)).toBe("business");
  });
});

describe("analyticsHref tab", () => {
  it("omits the default tab and adds tab=usage", () => {
    expect(analyticsHref({ preset: 30 })).toBe("/analytics");
    expect(analyticsHref({ preset: 30 }, "usage")).toBe("/analytics?tab=usage");
    expect(analyticsHref({ preset: 7 }, "usage")).toBe("/analytics?days=7&tab=usage");
    expect(analyticsHref({ from: "2026-10-01", to: "2026-10-10" }, "usage")).toBe(
      "/analytics?from=2026-10-01&to=2026-10-10&tab=usage",
    );
  });
});

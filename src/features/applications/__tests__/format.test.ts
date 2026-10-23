import { describe, expect, it } from "vitest";
import {
  applicationTimelineSteps,
  formatBytes,
  formatInr,
  summariseAvailability,
  timelineIndex,
} from "@/features/applications/format";

describe("formatters", () => {
  it("formats INR in ASCII and handles null", () => {
    expect(formatInr(1200)).toBe("INR 1,200");
    expect(formatInr(null)).toBe("Not given");
  });

  it("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });

  it("summarises availability per weekday in order", () => {
    const row = (weekday: number, start: number, end: number) => ({
      id: `${weekday}-${start}`,
      trainer_id: "t",
      weekday,
      start_minute: start,
      end_minute: end,
    });
    expect(summariseAvailability([row(3, 1080, 1200), row(1, 360, 540), row(1, 1080, 1200)])).toEqual([
      { day: "Mon", ranges: "06:00-09:00, 18:00-20:00" },
      { day: "Wed", ranges: "18:00-20:00" },
    ]);
  });
});

describe("applicationTimelineSteps", () => {
  const created = "2026-10-20T11:17:00Z";
  const submitted = "2026-10-18T11:17:00Z";
  const updated = "2026-10-21T09:00:00Z";

  it("keeps rank order and never dates the draft after the submission", () => {
    const steps = applicationTimelineSteps({
      status: "submitted",
      createdAt: created,
      submittedAt: submitted,
      updatedAt: updated,
    });
    expect(steps.map((step) => step.key)).toEqual([
      "draft",
      "submitted",
      "under_review",
      "needs_information",
      "decision",
    ]);
    expect(steps[0]?.at).toBe(submitted);
    expect(steps[1]?.at).toBe(submitted);
  });

  it("leaves consistent timestamps as they are", () => {
    const steps = applicationTimelineSteps({
      status: "approved",
      createdAt: "2026-10-10T10:00:00Z",
      submittedAt: "2026-10-12T10:00:00Z",
      updatedAt: "2026-10-14T10:00:00Z",
    });
    expect(steps.map((step) => step.at)).toEqual([
      "2026-10-10T10:00:00Z",
      "2026-10-12T10:00:00Z",
      null,
      null,
      "2026-10-14T10:00:00Z",
    ]);
    expect(steps[4]?.label).toBe("Approved");
  });

  it("keeps the created time on a draft that was never submitted", () => {
    const steps = applicationTimelineSteps({
      status: "draft",
      createdAt: created,
      submittedAt: null,
      updatedAt: updated,
    });
    expect(steps[0]?.at).toBe(created);
    expect(timelineIndex("draft")).toBe(0);
    expect(timelineIndex("rejected")).toBe(4);
  });
});


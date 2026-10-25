import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatInr,
  requiredDocumentTone,
  summariseAvailability,
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

describe("requiredDocumentTone", () => {
  it("colours accepted, rejected, waiting and missing apart", () => {
    expect(requiredDocumentTone("accepted")).toMatch(/success/);
    expect(requiredDocumentTone("rejected")).toMatch(/destructive/);
    expect(requiredDocumentTone("waiting")).toMatch(/warning/);
    expect(requiredDocumentTone("resubmitted")).toMatch(/warning/);
    expect(requiredDocumentTone("missing")).toBe("text-muted-foreground");
  });
});

import { describe, expect, it } from "vitest";
import {
  parseIntegerListText,
  parseIntegerText,
  setSettingSchema,
  storedSettingValue,
} from "@/features/settings/schemas";

const policy = { home: "h", online: "o", cancellation: "c" };

describe("setSettingSchema", () => {
  it("bounds the cancellation window to 0-168 whole hours", () => {
    const check = (value: number) => setSettingSchema.safeParse({ key: "booking.cancellation_window_hours", value }).success;
    expect(check(0)).toBe(true);
    expect(check(168)).toBe(true);
    expect(check(169)).toBe(false);
    expect(check(-1)).toBe(false);
    expect(check(1.5)).toBe(false);
    expect(check(Number.NaN)).toBe(false);
  });

  it("bounds session durations to 15-240, 1-6 unique entries", () => {
    const check = (value: number[]) => setSettingSchema.safeParse({ key: "booking.session_durations", value }).success;
    expect(check([30, 60])).toBe(true);
    expect(check([])).toBe(false);
    expect(check([14])).toBe(false);
    expect(check([241])).toBe(false);
    expect(check([30, 30])).toBe(false);
    expect(check([15, 30, 45, 60, 75, 90, 105])).toBe(false);
  });

  it("requires all three non-empty policy lines and nothing extra", () => {
    const check = (value: unknown) => setSettingSchema.safeParse({ key: "booking.policy_copy", value }).success;
    expect(check(policy)).toBe(true);
    expect(check({ ...policy, home: "  " })).toBe(false);
    expect(check({ home: "h", online: "o" })).toBe(false);
    expect(check({ ...policy, extra: "x" })).toBe(false);
    expect(check({ ...policy, online: "x".repeat(1001) })).toBe(false);
  });

  it("bounds the highest rate", () => {
    const check = (value: number) => setSettingSchema.safeParse({ key: "trainer.max_rate_inr", value }).success;
    expect(check(1)).toBe(true);
    expect(check(0)).toBe(false);
    expect(check(100001)).toBe(false);
  });

  it("checks the emergency number pattern", () => {
    const check = (value: string) => setSettingSchema.safeParse({ key: "support.emergency_number", value }).success;
    expect(check("112")).toBe(true);
    expect(check("+91 98765-43210")).toBe(true);
    expect(check("1")).toBe(false);
    expect(check("call me")).toBe(false);
  });

  it("rejects an unknown key", () => {
    expect(setSettingSchema.safeParse({ key: "other.key", value: 1 }).success).toBe(false);
  });
});

describe("text parsing", () => {
  it("turns blank into NaN and text into numbers", () => {
    expect(parseIntegerText(" 24 ")).toBe(24);
    expect(parseIntegerText(" ")).toBeNaN();
    expect(parseIntegerText("abc")).toBeNaN();
    expect(parseIntegerListText("45, 60,, 90")).toEqual([45, 60, 90]);
  });

  it("returns the stored value only when it fits the shape", () => {
    expect(storedSettingValue("booking.cancellation_window_hours", 24)).toBe(24);
    expect(storedSettingValue("booking.cancellation_window_hours", "24")).toBeNull();
    expect(storedSettingValue("booking.session_durations", null)).toBeNull();
  });
});

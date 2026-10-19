import { describe, expect, it } from "vitest";
import { bookingStatusTone, formatSessionRange, paymentStatusTone } from "@/features/bookings/format";

describe("tones", () => {
  it("maps booking statuses", () => {
    expect(bookingStatusTone("confirmed")).toContain("success");
    expect(bookingStatusTone("requested")).toContain("warning");
    expect(bookingStatusTone("disputed")).toContain("destructive");
    expect(bookingStatusTone("cancelled")).toBe("text-muted-foreground");
  });

  it("maps payment statuses", () => {
    expect(paymentStatusTone("paid")).toContain("success");
    expect(paymentStatusTone("refund_pending")).toContain("warning");
    expect(paymentStatusTone("failed")).toContain("destructive");
    expect(paymentStatusTone("refunded")).toBe("text-muted-foreground");
  });
});

describe("formatSessionRange", () => {
  it("shows one date for a same-day session in India time", () => {
    const text = formatSessionRange("2026-10-20T01:30:00Z", "2026-10-20T02:30:00Z");
    expect(text).toContain("07:00");
    expect(text).toContain("08:00");
    expect(text.match(/2026/g)).toHaveLength(1);
  });

  it("shows both dates when the session crosses midnight in India", () => {
    const text = formatSessionRange("2026-10-20T18:00:00Z", "2026-10-20T19:00:00Z");
    expect(text.match(/2026/g)).toHaveLength(2);
  });
});

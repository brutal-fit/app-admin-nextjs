import { describe, expect, it } from "vitest";
import {
  bookingListHref,
  canResolveDispute,
  cancelBookingSchema,
  EMPTY_BOOKING_FILTERS,
  hasBookingFilters,
  invalidDateRange,
  isCancellable,
  parseBookingFilters,
  resolveDisputeSchema,
} from "@/features/bookings/schemas";

const ID = "11111111-1111-4111-8111-111111111111";

describe("parseBookingFilters", () => {
  it("reads valid filters", () => {
    const filters = parseBookingFilters({
      status: "confirmed",
      mode: "home",
      from: "2026-10-01",
      to: "2026-10-31",
      trainer: ID,
      client: ID,
      page: "3",
    });
    expect(filters).toEqual({
      status: "confirmed",
      mode: "home",
      from: "2026-10-01",
      to: "2026-10-31",
      trainerId: ID,
      clientId: ID,
      page: 3,
    });
  });

  it("drops unknown values instead of failing", () => {
    const filters = parseBookingFilters({
      status: "bogus",
      mode: "space",
      from: "2026-02-30",
      to: "tomorrow",
      trainer: "nope",
      page: "-4",
    });
    expect(filters).toEqual(EMPTY_BOOKING_FILTERS);
  });

  it("uses the first value of a repeated param", () => {
    expect(parseBookingFilters({ mode: ["online", "home"] }).mode).toBe("online");
  });
});

describe("bookingListHref", () => {
  it("round-trips filters through the URL", () => {
    const filters = parseBookingFilters({ status: "requested", mode: "online", trainer: ID, page: "2" });
    const href = bookingListHref(filters, { page: filters.page });
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseBookingFilters(params)).toEqual(filters);
  });

  it("resets to page 1 when a filter changes and omits empty filters", () => {
    const current = { ...EMPTY_BOOKING_FILTERS, page: 4 };
    expect(bookingListHref(current, { status: "completed" })).toBe("/bookings?status=completed");
    expect(bookingListHref(EMPTY_BOOKING_FILTERS)).toBe("/bookings");
  });
});

describe("filter helpers", () => {
  it("hasBookingFilters ignores the page", () => {
    expect(hasBookingFilters({ ...EMPTY_BOOKING_FILTERS, page: 2 })).toBe(false);
    expect(hasBookingFilters({ ...EMPTY_BOOKING_FILTERS, mode: "home" })).toBe(true);
  });

  it("invalidDateRange flags an end before the start", () => {
    expect(invalidDateRange({ from: "2026-10-10", to: "2026-10-01" })).toBe(true);
    expect(invalidDateRange({ from: "2026-10-01", to: "2026-10-01" })).toBe(false);
    expect(invalidDateRange({ from: null, to: "2026-10-01" })).toBe(false);
  });
});

describe("status rules", () => {
  it("allows cancel only for open bookings", () => {
    expect(isCancellable("requested")).toBe(true);
    expect(isCancellable("confirmed")).toBe(true);
    expect(isCancellable("reschedule_requested")).toBe(true);
    expect(isCancellable("completed")).toBe(false);
    expect(isCancellable("cancelled")).toBe(false);
  });

  it("allows resolving a dispute once, after the session", () => {
    expect(canResolveDispute("completed", null)).toBe(true);
    expect(canResolveDispute("no_show", null)).toBe(true);
    expect(canResolveDispute("completed", "2026-10-19T00:00:00Z")).toBe(false);
    expect(canResolveDispute("confirmed", null)).toBe(false);
  });
});

describe("cancelBookingSchema", () => {
  it("requires a reason and trims it", () => {
    expect(cancelBookingSchema.safeParse({ bookingId: ID, reason: "   " }).success).toBe(false);
    const ok = cancelBookingSchema.safeParse({ bookingId: ID, reason: "  trainer ill " });
    expect(ok.success && ok.data.reason).toBe("trainer ill");
  });

  it("caps the reason at 300 characters and rejects a bad id", () => {
    expect(cancelBookingSchema.safeParse({ bookingId: ID, reason: "a".repeat(300) }).success).toBe(true);
    expect(cancelBookingSchema.safeParse({ bookingId: ID, reason: "a".repeat(301) }).success).toBe(false);
    expect(cancelBookingSchema.safeParse({ bookingId: "x", reason: "ok" }).success).toBe(false);
  });
});

describe("resolveDisputeSchema", () => {
  it("requires a known outcome and a note", () => {
    expect(resolveDisputeSchema.safeParse({ bookingId: ID, outcome: "completed", note: "seen" }).success).toBe(true);
    expect(resolveDisputeSchema.safeParse({ bookingId: ID, outcome: "refunded", note: "seen" }).success).toBe(false);
    expect(resolveDisputeSchema.safeParse({ bookingId: ID, outcome: "no_show", note: " " }).success).toBe(false);
    expect(resolveDisputeSchema.safeParse({ bookingId: ID, outcome: "no_show", note: "a".repeat(1001) }).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  EMPTY_PAYMENT_FILTERS,
  effectiveDateRange,
  hasPaymentFilters,
  invalidPaymentRange,
  isRefundable,
  needsAttention,
  parsePaymentFilters,
  parsePaymentSearch,
  paymentListHref,
  refundBlockedReason,
  refundPaymentSchema,
} from "@/features/payments/schemas";

// 2026-10-22 12:00 India time.
const NOW = Date.parse("2026-10-22T06:30:00Z");
const ID = "11111111-1111-4111-8111-111111111111";

describe("parsePaymentFilters", () => {
  it("reads every filter from the URL and drops unknown values", () => {
    expect(
      parsePaymentFilters({ state: "refunded", from: "2026-10-01", to: "nope", q: "  order_X ", page: "3" }),
    ).toEqual({ state: "refunded", attention: false, from: "2026-10-01", to: null, q: "order_X", page: 3 });
    expect(parsePaymentFilters({ state: "bogus", page: "-1" })).toEqual(EMPTY_PAYMENT_FILTERS);
  });

  it("drops the state filter while Needs attention is on", () => {
    expect(parsePaymentFilters({ attention: "yes", state: "paid" })).toMatchObject({ attention: true, state: null });
  });
});

describe("paymentListHref", () => {
  it("keeps filters, starts at page 1 and keeps state and attention apart", () => {
    const filters = { ...EMPTY_PAYMENT_FILTERS, state: "paid" as const, q: "pay_1", page: 4 };
    expect(paymentListHref(filters)).toBe("/payments?state=paid&q=pay_1");
    expect(paymentListHref(filters, { attention: true })).toBe("/payments?attention=yes&q=pay_1");
    expect(paymentListHref(filters, { page: 2 })).toBe("/payments?state=paid&q=pay_1&page=2");
    expect(paymentListHref(EMPTY_PAYMENT_FILTERS)).toBe("/payments");
    expect(hasPaymentFilters(EMPTY_PAYMENT_FILTERS)).toBe(false);
    expect(hasPaymentFilters(filters)).toBe(true);
  });
});

describe("effectiveDateRange", () => {
  it("defaults to the last 30 days, today included", () => {
    expect(effectiveDateRange(EMPTY_PAYMENT_FILTERS, NOW)).toEqual({ from: "2026-09-23", to: "2026-10-22" });
  });

  it("reads every date for a search or Needs attention, and the URL's dates when given", () => {
    expect(effectiveDateRange({ ...EMPTY_PAYMENT_FILTERS, q: "order_1" }, NOW)).toEqual({ from: null, to: null });
    expect(effectiveDateRange({ ...EMPTY_PAYMENT_FILTERS, attention: true }, NOW)).toEqual({ from: null, to: null });
    expect(effectiveDateRange({ ...EMPTY_PAYMENT_FILTERS, q: "x", from: "2026-01-01" }, NOW)).toEqual({
      from: "2026-01-01",
      to: null,
    });
    expect(invalidPaymentRange({ from: "2026-10-02", to: "2026-10-01" })).toBe(true);
    expect(invalidPaymentRange({ from: "2026-10-01", to: null })).toBe(false);
  });
});

describe("parsePaymentSearch", () => {
  it("tells ids, order ids, payment ids and phone digits apart", () => {
    expect(parsePaymentSearch("")).toEqual({ kind: "none" });
    expect(parsePaymentSearch(ID.toUpperCase())).toEqual({ kind: "id", search: { kind: "uuid", value: ID } });
    expect(parsePaymentSearch("order_Abc123")).toEqual({ kind: "id", search: { kind: "order", value: "order_Abc123" } });
    expect(parsePaymentSearch("pay_Abc123")).toEqual({ kind: "id", search: { kind: "payment", value: "pay_Abc123" } });
    expect(parsePaymentSearch("Abc123")).toEqual({ kind: "id", search: { kind: "provider_id", value: "Abc123" } });
    expect(parsePaymentSearch("+91 90000-00001")).toEqual({ kind: "phone", digits: "919000000001" });
  });

  it("refuses text the filter grammar could not carry and too few digits", () => {
    expect(parsePaymentSearch("a,b").kind).toBe("invalid");
    expect(parsePaymentSearch("order_1)").kind).toBe("invalid");
    expect(parsePaymentSearch("123").kind).toBe("invalid");
  });
});

describe("needsAttention", () => {
  const hoursAgo = (hours: number) => new Date(NOW - hours * 3600_000).toISOString();

  it("flags every failed refund and queued refunds older than an hour", () => {
    expect(needsAttention({ state: "refund_failed", updated_at: hoursAgo(0) }, NOW)).toBe(true);
    expect(needsAttention({ state: "refund_pending", updated_at: hoursAgo(2) }, NOW)).toBe(true);
    expect(needsAttention({ state: "refund_pending", updated_at: hoursAgo(0.5) }, NOW)).toBe(false);
    for (const state of ["created", "paid", "failed", "refund_requested", "refunded"] as const) {
      expect(needsAttention({ state, updated_at: hoursAgo(48) }, NOW)).toBe(false);
    }
  });
});

describe("refunds", () => {
  it("allows a refund only from paid or refund_failed, and says why otherwise", () => {
    expect(isRefundable("paid")).toBe(true);
    expect(isRefundable("refund_failed")).toBe(true);
    expect(refundBlockedReason("paid")).toBeNull();
    for (const state of ["created", "failed", "refund_pending", "refund_requested", "refunded"] as const) {
      expect(isRefundable(state)).toBe(false);
      expect(refundBlockedReason(state)).toMatch(/\w/);
    }
  });

  it("needs a payment uuid and a reason of 10 to 200 characters", () => {
    expect(refundPaymentSchema.safeParse({ paymentId: ID, reason: "Client asked twice" }).success).toBe(true);
    expect(refundPaymentSchema.safeParse({ paymentId: ID, reason: "  too short " }).success).toBe(false);
    expect(refundPaymentSchema.safeParse({ paymentId: ID, reason: "x".repeat(201) }).success).toBe(false);
    expect(refundPaymentSchema.safeParse({ paymentId: "nope", reason: "Client asked twice" }).success).toBe(false);
  });
});

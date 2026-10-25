import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  refresh: vi.fn(),
  cancelSubscription: vi.fn(),
  listSubscriptionPeriods: vi.fn(),
  listPaymentsByIds: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {}, redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/rbac/require-permission", async () => {
  class ForbiddenError extends Error {}
  return { ForbiddenError, requirePermission: mocks.requirePermission };
});
vi.mock("@/lib/db/subscriptions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/subscriptions")>()),
  cancelSubscription: mocks.cancelSubscription,
  listSubscriptionPeriods: mocks.listSubscriptionPeriods,
}));
vi.mock("@/lib/db/payments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/payments")>()),
  listPaymentsByIds: mocks.listPaymentsByIds,
}));

import { cancelSubscriptionAction } from "@/features/subscriptions/actions";
import { ForbiddenError } from "@/lib/rbac/require-permission";
import { paymentRow } from "@/features/payments/__tests__/fixtures";
import { PAYMENT_ID, SUBSCRIPTION_ID, periodRow } from "./fixtures";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requirePermission.mockResolvedValue({ permissions: ["bookings.read", "bookings.cancel", "payments.read"] });
  mocks.cancelSubscription.mockResolvedValue({});
});

describe("cancelSubscriptionAction", () => {
  it("checks bookings.cancel, calls the data layer with the id and reason and reports the refund", async () => {
    mocks.listSubscriptionPeriods
      .mockResolvedValueOnce([periodRow({ status: "paid" })])
      .mockResolvedValueOnce([periodRow({ status: "refund_pending" })]);
    mocks.listPaymentsByIds.mockResolvedValue([
      paymentRow({ id: PAYMENT_ID, amount_inr: 10800, refund_amount_inr: 3600, state: "refund_pending" }),
    ]);
    const result = await cancelSubscriptionAction({ id: SUBSCRIPTION_ID, reason: "  Trainer moved away  " });
    expect(mocks.requirePermission).toHaveBeenCalledWith("bookings.cancel");
    expect(mocks.cancelSubscription).toHaveBeenCalledWith({}, { id: SUBSCRIPTION_ID, reason: "Trainer moved away" });
    expect(mocks.listPaymentsByIds).toHaveBeenCalledWith({}, [PAYMENT_ID]);
    expect(result).toEqual({
      ok: true,
      data: { known: true, refunds: [{ seq: 1, amountInr: 3600, partial: true }], lapsed: 0 },
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("leaves the amount out without payments.read", async () => {
    mocks.requirePermission.mockResolvedValue({ permissions: ["bookings.read", "bookings.cancel"] });
    mocks.listSubscriptionPeriods
      .mockResolvedValueOnce([periodRow({ status: "paid" })])
      .mockResolvedValueOnce([periodRow({ status: "refund_pending" })]);
    const result = await cancelSubscriptionAction({ id: SUBSCRIPTION_ID, reason: "Trainer moved away" });
    expect(mocks.listPaymentsByIds).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      data: { known: true, refunds: [{ seq: 1, amountInr: null, partial: false }], lapsed: 0 },
    });
  });

  it.each([
    ["under 10", "too short"],
    ["over 200", "x".repeat(201)],
  ])("refuses a reason %s characters without calling the server", async (_label, reason) => {
    const result = await cancelSubscriptionAction({ id: SUBSCRIPTION_ID, reason });
    expect(result.ok).toBe(false);
    expect(mocks.cancelSubscription).not.toHaveBeenCalled();
  });

  it("is refused without bookings.cancel", async () => {
    mocks.requirePermission.mockRejectedValue(new ForbiddenError("bookings.cancel"));
    const result = await cancelSubscriptionAction({ id: SUBSCRIPTION_ID, reason: "Trainer moved away" });
    expect(result.ok).toBe(false);
    expect(mocks.cancelSubscription).not.toHaveBeenCalled();
  });
});

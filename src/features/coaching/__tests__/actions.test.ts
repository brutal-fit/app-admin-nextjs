import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  refresh: vi.fn(),
  endCoaching: vi.fn(),
  listCoachingPeriods: vi.fn(),
  listPaymentsByIds: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {}, redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/rbac/require-permission", async () => {
  class ForbiddenError extends Error {}
  return { ForbiddenError, requirePermission: mocks.requirePermission };
});
vi.mock("@/lib/db/coaching", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/coaching")>()),
  endCoaching: mocks.endCoaching,
  listCoachingPeriods: mocks.listCoachingPeriods,
}));
vi.mock("@/lib/db/payments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/payments")>()),
  listPaymentsByIds: mocks.listPaymentsByIds,
}));

import { endCoachingAction } from "@/features/coaching/actions";
import { ForbiddenError } from "@/lib/rbac/require-permission";
import { paymentRow } from "@/features/payments/__tests__/fixtures";
import { COACHING_ID, PAYMENT_ID, coachingPeriodRow } from "@/features/subscriptions/__tests__/fixtures";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requirePermission.mockResolvedValue({ permissions: ["bookings.read", "bookings.cancel", "payments.read"] });
  mocks.endCoaching.mockResolvedValue({});
});

describe("endCoachingAction", () => {
  it("checks bookings.cancel, calls the data layer with the id and reason and reports the refund", async () => {
    mocks.listCoachingPeriods
      .mockResolvedValueOnce([coachingPeriodRow({ status: "paid" })])
      .mockResolvedValueOnce([coachingPeriodRow({ status: "refund_pending" })]);
    mocks.listPaymentsByIds.mockResolvedValue([paymentRow({ id: PAYMENT_ID, amount_inr: 1500, state: "refund_pending" })]);
    const result = await endCoachingAction({ id: COACHING_ID, reason: " Coach is unavailable " });
    expect(mocks.requirePermission).toHaveBeenCalledWith("bookings.cancel");
    expect(mocks.endCoaching).toHaveBeenCalledWith({}, { id: COACHING_ID, reason: "Coach is unavailable" });
    expect(result).toEqual({
      ok: true,
      data: { known: true, refunds: [{ seq: 1, amountInr: 1500, partial: false }], lapsed: 0 },
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("reports an unknown outcome when the months cannot be read back", async () => {
    mocks.listCoachingPeriods.mockRejectedValue(new Error("down"));
    const result = await endCoachingAction({ id: COACHING_ID, reason: "Coach is unavailable" });
    expect(mocks.endCoaching).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: { known: false } });
  });

  it("refuses a short reason and a missing key without calling the server", async () => {
    expect((await endCoachingAction({ id: COACHING_ID, reason: "short" })).ok).toBe(false);
    mocks.requirePermission.mockRejectedValue(new ForbiddenError("bookings.cancel"));
    expect((await endCoachingAction({ id: COACHING_ID, reason: "Coach is unavailable" })).ok).toBe(false);
    expect(mocks.endCoaching).not.toHaveBeenCalled();
  });
});

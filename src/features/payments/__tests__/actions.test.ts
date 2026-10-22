import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  refresh: vi.fn(),
  refundPayment: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {}, redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/rbac/require-permission", async () => {
  class ForbiddenError extends Error {}
  return { ForbiddenError, requirePermission: mocks.requirePermission };
});
vi.mock("@/lib/db/payments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/payments")>()),
  refundPayment: mocks.refundPayment,
}));

import { refundPaymentAction } from "@/features/payments/actions";
import { ForbiddenError } from "@/lib/rbac/require-permission";

const ID = "a1111111-1111-4111-8111-111111111111";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requirePermission.mockResolvedValue({});
});

describe("refundPaymentAction", () => {
  it("checks payments.manage, calls the data layer with the id and reason and refreshes", async () => {
    mocks.refundPayment.mockResolvedValue({ outcome: "requested", state: "refund_requested", refundId: "rfnd_1" });
    const result = await refundPaymentAction({ paymentId: ID, reason: "  Client asked twice  " });
    expect(result).toEqual({ ok: true, data: { outcome: "requested", state: "refund_requested", refundId: "rfnd_1" } });
    expect(mocks.requirePermission).toHaveBeenCalledWith("payments.manage");
    expect(mocks.refundPayment).toHaveBeenCalledWith({}, { paymentId: ID, reason: "Client asked twice" });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("refuses a reason under 10 characters without calling the function", async () => {
    const result = await refundPaymentAction({ paymentId: ID, reason: "too short" });
    expect(result.ok).toBe(false);
    expect(mocks.refundPayment).not.toHaveBeenCalled();
  });

  it("is refused without payments.manage", async () => {
    mocks.requirePermission.mockRejectedValue(new ForbiddenError("payments.manage"));
    const result = await refundPaymentAction({ paymentId: ID, reason: "Client asked twice" });
    expect(result.ok).toBe(false);
    expect(mocks.refundPayment).not.toHaveBeenCalled();
  });
});

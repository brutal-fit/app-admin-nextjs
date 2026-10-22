import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  refresh: vi.fn(),
  verifyGym: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {}, redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/rbac/require-permission", async () => {
  class ForbiddenError extends Error {}
  return { ForbiddenError, requirePermission: mocks.requirePermission };
});
vi.mock("@/lib/db/gyms-admin", () => ({
  createGym: vi.fn(),
  setGymListed: vi.fn(),
  setGymServicePrice: vi.fn(),
  verifyGym: mocks.verifyGym,
}));

import { verifyGymAction } from "@/features/gyms/actions";
import { allowedDecisions, verifyGymSchema } from "@/features/gyms/schemas";
import { ForbiddenError } from "@/lib/rbac/require-permission";

const GYM = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requirePermission.mockResolvedValue({});
});

describe("verifyGymAction", () => {
  it("checks gyms.manage, calls the data layer and refreshes", async () => {
    const result = await verifyGymAction({ gymId: GYM, decision: "verified", note: "" });
    expect(result.ok).toBe(true);
    expect(mocks.requirePermission).toHaveBeenCalledWith("gyms.manage");
    expect(mocks.verifyGym).toHaveBeenCalledWith({}, { gymId: GYM, decision: "verified", note: null });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("requires a note to send back", async () => {
    const result = await verifyGymAction({ gymId: GYM, decision: "rejected", note: "  " });
    expect(result.ok).toBe(false);
    expect(mocks.verifyGym).not.toHaveBeenCalled();
  });

  it("does not call the data layer when the permission check fails", async () => {
    mocks.requirePermission.mockRejectedValue(new ForbiddenError("gyms.manage"));
    const result = await verifyGymAction({ gymId: GYM, decision: "verified", note: "" });
    expect(result.ok).toBe(false);
    expect(mocks.verifyGym).not.toHaveBeenCalled();
  });

  it("rejects an unknown gym id", async () => {
    const result = await verifyGymAction({ gymId: "nope", decision: "verified", note: "" });
    expect(result.ok).toBe(false);
    expect(mocks.verifyGym).not.toHaveBeenCalled();
  });
});

describe("verify decisions", () => {
  it("offers decisions by status", () => {
    expect(allowedDecisions("submitted")).toEqual(["verified", "rejected"]);
    expect(allowedDecisions("listed")).toEqual(["suspended"]);
    expect(allowedDecisions("suspended")).toEqual(["verified"]);
    expect(allowedDecisions("draft")).toEqual([]);
  });

  it("needs a reason to suspend but not to verify", () => {
    expect(verifyGymSchema.safeParse({ gymId: GYM, decision: "suspended", note: "" }).success).toBe(false);
    expect(verifyGymSchema.safeParse({ gymId: GYM, decision: "verified", note: "" }).success).toBe(true);
  });
});

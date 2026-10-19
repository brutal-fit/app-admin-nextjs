import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  refresh: vi.fn(),
  cancelBooking: vi.fn(),
  resolveDispute: vi.fn(),
  moderateReview: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {}, redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/rbac/require-permission", async () => {
  class ForbiddenError extends Error {}
  return { ForbiddenError, requirePermission: mocks.requirePermission };
});
vi.mock("@/lib/db/bookings", () => ({
  cancelBooking: mocks.cancelBooking,
  resolveDispute: mocks.resolveDispute,
}));
vi.mock("@/lib/db/reviews", () => ({ moderateReview: mocks.moderateReview }));

import { cancelBookingAction, resolveDisputeAction } from "@/features/bookings/actions";
import { moderateReviewAction } from "@/features/reviews/actions";
import { ForbiddenError } from "@/lib/rbac/require-permission";

const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requirePermission.mockResolvedValue({});
});

describe("cancelBookingAction", () => {
  it("checks bookings.cancel, calls the function and refreshes", async () => {
    const result = await cancelBookingAction({ bookingId: ID, reason: "trainer ill" });
    expect(result.ok).toBe(true);
    expect(mocks.requirePermission).toHaveBeenCalledWith("bookings.cancel");
    expect(mocks.cancelBooking).toHaveBeenCalledWith({}, { bookingId: ID, reason: "trainer ill" });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("refuses an empty reason without calling the function", async () => {
    const result = await cancelBookingAction({ bookingId: ID, reason: " " });
    expect(result.ok).toBe(false);
    expect(mocks.cancelBooking).not.toHaveBeenCalled();
  });

  it("maps a missing permission to an error result", async () => {
    mocks.requirePermission.mockRejectedValue(new ForbiddenError("bookings.cancel"));
    const result = await cancelBookingAction({ bookingId: ID, reason: "x" });
    expect(result.ok).toBe(false);
    expect(mocks.cancelBooking).not.toHaveBeenCalled();
  });
});

describe("resolveDisputeAction", () => {
  it("checks bookings.cancel and needs a note", async () => {
    expect((await resolveDisputeAction({ bookingId: ID, outcome: "completed", note: "" })).ok).toBe(false);
    expect(mocks.resolveDispute).not.toHaveBeenCalled();
    const result = await resolveDisputeAction({ bookingId: ID, outcome: "completed", note: "verified" });
    expect(result.ok).toBe(true);
    expect(mocks.requirePermission).toHaveBeenCalledWith("bookings.cancel");
    expect(mocks.resolveDispute).toHaveBeenCalledTimes(1);
  });

  it("is refused without the key", async () => {
    mocks.requirePermission.mockRejectedValue(new ForbiddenError("bookings.cancel"));
    const result = await resolveDisputeAction({ bookingId: ID, outcome: "no_show", note: "n" });
    expect(result.ok).toBe(false);
    expect(mocks.resolveDispute).not.toHaveBeenCalled();
  });
});

describe("moderateReviewAction", () => {
  it("checks reviews.moderate and requires a reason", async () => {
    expect((await moderateReviewAction({ reviewId: ID, hidden: true, reason: "" })).ok).toBe(false);
    expect(mocks.moderateReview).not.toHaveBeenCalled();
    const result = await moderateReviewAction({ reviewId: ID, hidden: true, reason: "abuse" });
    expect(result.ok).toBe(true);
    expect(mocks.requirePermission).toHaveBeenCalledWith("reviews.moderate");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("is refused without the key", async () => {
    mocks.requirePermission.mockRejectedValue(new ForbiddenError("reviews.moderate"));
    expect((await moderateReviewAction({ reviewId: ID, hidden: false, reason: "ok" })).ok).toBe(false);
    expect(mocks.moderateReview).not.toHaveBeenCalled();
  });
});

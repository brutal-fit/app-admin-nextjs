import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  refresh: vi.fn(),
  respondToReschedule: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {}, redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock("@/lib/rbac/require-permission", async () => {
  class ForbiddenError extends Error {}
  return { ForbiddenError, requirePermission: mocks.requirePermission };
});
vi.mock("@/stores/toast-store", () => ({ showToast: mocks.showToast }));
vi.mock("@/lib/db/gyms-manager", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/gyms-manager")>()),
  respondToReschedule: mocks.respondToReschedule,
}));

import { respondToRescheduleAction } from "@/features/my-gym/actions";
import { RescheduleAnswer } from "@/features/my-gym/components/reschedule-answer";
import { ForbiddenError } from "@/lib/rbac/require-permission";

const BOOKING = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requirePermission.mockResolvedValue({});
});
afterEach(cleanup);

describe("respondToReschedule (data layer)", () => {
  it("calls respond_to_reschedule with the booking id and the answer", async () => {
    const { respondToReschedule } = await vi.importActual<typeof import("@/lib/db/gyms-manager")>("@/lib/db/gyms-manager");
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    await respondToReschedule({ rpc } as never, BOOKING, true);
    expect(rpc).toHaveBeenCalledWith("respond_to_reschedule", { p_id: BOOKING, p_accept: true });
  });

  it("throws a typed BRPRM when the caller does not manage the gym", async () => {
    const { respondToReschedule } = await vi.importActual<typeof import("@/lib/db/gyms-manager")>("@/lib/db/gyms-manager");
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "BRPRM", message: "Only a manager of this gym can do that.", details: "", hint: "" },
    });
    await expect(respondToReschedule({ rpc } as never, BOOKING, false)).rejects.toMatchObject({ code: "BRPRM" });
  });
});

describe("respondToRescheduleAction", () => {
  it("checks gym.self, accepts through the data layer and refreshes", async () => {
    const result = await respondToRescheduleAction({ bookingId: BOOKING, accept: true });
    expect(result.ok).toBe(true);
    expect(mocks.requirePermission).toHaveBeenCalledWith("gym.self");
    expect(mocks.respondToReschedule).toHaveBeenCalledWith({}, BOOKING, true);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("does not call the server without gym.self", async () => {
    mocks.requirePermission.mockRejectedValue(new ForbiddenError("gym.self"));
    const result = await respondToRescheduleAction({ bookingId: BOOKING, accept: true });
    expect(result.ok).toBe(false);
    expect(mocks.respondToReschedule).not.toHaveBeenCalled();
  });

  it("rejects a missing answer or an unknown booking", async () => {
    expect((await respondToRescheduleAction({ bookingId: BOOKING })).ok).toBe(false);
    expect((await respondToRescheduleAction({ bookingId: "nope", accept: true })).ok).toBe(false);
    expect(mocks.respondToReschedule).not.toHaveBeenCalled();
  });
});

describe("RescheduleAnswer", () => {
  it("Accept sends the booking id and true", async () => {
    render(<RescheduleAnswer bookingId={BOOKING} askedTime="Fri 24 Oct, 7:00 to 8:00 am" />);
    fireEvent.click(screen.getByRole("button", { name: "Accept new time" }));
    await waitFor(() => expect(mocks.respondToReschedule).toHaveBeenCalledWith({}, BOOKING, true));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("success", "Moved to Fri 24 Oct, 7:00 to 8:00 am."));
  });

  it("Keep original sends false", async () => {
    render(<RescheduleAnswer bookingId={BOOKING} askedTime="x" />);
    fireEvent.click(screen.getByRole("button", { name: "Keep original" }));
    await waitFor(() => expect(mocks.respondToReschedule).toHaveBeenCalledWith({}, BOOKING, false));
  });
});

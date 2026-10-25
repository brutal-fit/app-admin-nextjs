import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ endCoachingAction: vi.fn(), showToast: vi.fn() }));

vi.mock("@/features/coaching/actions", () => ({ endCoachingAction: mocks.endCoachingAction }));
vi.mock("@/stores/toast-store", () => ({ showToast: mocks.showToast }));

import { EndCoachingDialog } from "@/features/coaching/components/end-coaching-dialog";
import { COACHING_ID } from "@/features/subscriptions/__tests__/fixtures";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});
afterEach(cleanup);

function openAndSubmit(reason: string) {
  render(<EndCoachingDialog coachingId={COACHING_ID} />);
  fireEvent.click(screen.getByRole("button", { name: "End coaching" }));
  fireEvent.change(screen.getByLabelText("Reason (the client sees it)"), { target: { value: reason } });
  fireEvent.click(screen.getByRole("button", { name: "End coaching" }));
}

describe("EndCoachingDialog", () => {
  it("needs 10 to 200 characters before calling the server", () => {
    openAndSubmit("short");
    expect(screen.getByRole("alert").textContent).toMatch(/at least 10 characters/);
    cleanup();
    openAndSubmit("y".repeat(201));
    expect(screen.getByRole("alert").textContent).toMatch(/200 characters or fewer/);
    expect(mocks.endCoachingAction).not.toHaveBeenCalled();
  });

  it("calls the action with the id and reason and shows the refund", async () => {
    mocks.endCoachingAction.mockResolvedValue({
      ok: true,
      data: { known: true, refunds: [{ seq: 1, amountInr: 1500, partial: false }], lapsed: 0 },
    });
    openAndSubmit("Coach is unavailable for a month");
    await waitFor(() =>
      expect(mocks.endCoachingAction).toHaveBeenCalledWith({ id: COACHING_ID, reason: "Coach is unavailable for a month" }),
    );
    expect((await screen.findByRole("status")).textContent).toBe(
      "Refund queued: INR 1,500 for month 1. The refund queue sends it to Razorpay within minutes.",
    );
    expect(mocks.showToast).toHaveBeenCalledWith("success", "Coaching ended.");
  });
});

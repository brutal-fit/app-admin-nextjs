import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cancelSubscriptionAction: vi.fn(), showToast: vi.fn() }));

vi.mock("@/features/subscriptions/actions", () => ({ cancelSubscriptionAction: mocks.cancelSubscriptionAction }));
vi.mock("@/stores/toast-store", () => ({ showToast: mocks.showToast }));

import { CancelSubscriptionDialog } from "@/features/subscriptions/components/cancel-subscription-dialog";
import { SUBSCRIPTION_ID } from "./fixtures";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});
afterEach(cleanup);

function open() {
  render(<CancelSubscriptionDialog subscriptionId={SUBSCRIPTION_ID} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel subscription" }));
}

function submit(reason: string) {
  fireEvent.change(screen.getByLabelText("Reason (the client sees it)"), { target: { value: reason } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel subscription" }));
}

describe("CancelSubscriptionDialog", () => {
  it("needs a reason of at least 10 characters before calling the server", () => {
    open();
    submit("too short");
    expect(screen.getByRole("alert").textContent).toMatch(/at least 10 characters/);
    expect(mocks.cancelSubscriptionAction).not.toHaveBeenCalled();
  });

  it("refuses a reason over 200 characters", () => {
    open();
    // The textarea caps typing at 200; a pasted longer value is still checked.
    submit("x".repeat(201));
    expect(screen.getByRole("alert").textContent).toMatch(/200 characters or fewer/);
    expect(mocks.cancelSubscriptionAction).not.toHaveBeenCalled();
  });

  it("calls the action with the id and reason and shows the refund the server queued", async () => {
    mocks.cancelSubscriptionAction.mockResolvedValue({
      ok: true,
      data: { known: true, refunds: [{ seq: 2, amountInr: 10800, partial: false }], lapsed: 1 },
    });
    open();
    submit("  Trainer moved out of the city  ");
    await waitFor(() => expect(mocks.cancelSubscriptionAction).toHaveBeenCalledTimes(1));
    expect(mocks.cancelSubscriptionAction).toHaveBeenCalledWith({
      id: SUBSCRIPTION_ID,
      reason: "Trainer moved out of the city",
    });
    expect((await screen.findByRole("status")).textContent).toBe(
      "Refund queued: INR 10,800 for period 2. The refund queue sends it to Razorpay within minutes. 1 unpaid period lapsed.",
    );
    expect(mocks.showToast).toHaveBeenCalledWith("success", "Subscription cancelled.");
  });

  it("shows the server's refusal inline", async () => {
    mocks.cancelSubscriptionAction.mockResolvedValue({
      ok: false,
      error: { code: "BRVAL", message: "This subscription has already ended." },
    });
    open();
    submit("Client asked by email twice");
    expect((await screen.findByRole("alert")).textContent).toBe("This subscription has already ended.");
  });
});

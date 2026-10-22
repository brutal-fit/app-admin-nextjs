import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refundPaymentAction: vi.fn(), showToast: vi.fn() }));

vi.mock("@/features/payments/actions", () => ({ refundPaymentAction: mocks.refundPaymentAction }));
vi.mock("@/stores/toast-store", () => ({ showToast: mocks.showToast }));

import { RefundPaymentDialog } from "@/features/payments/components/refund-payment-dialog";

const ID = "a1111111-1111-4111-8111-111111111111";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});
afterEach(cleanup);

function open(state: "paid" | "refund_failed" = "paid") {
  render(<RefundPaymentDialog paymentId={ID} state={state} amountInr={1200} />);
  fireEvent.click(screen.getByRole("button", { name: "Refund INR 1,200" }));
}

describe("RefundPaymentDialog", () => {
  it("is disabled, with the reason, for a refunded or an unpaid payment", () => {
    for (const state of ["refunded", "created"] as const) {
      render(<RefundPaymentDialog paymentId={ID} state={state} amountInr={1200} />);
      expect((screen.getByRole("button", { name: "Refund INR 1,200" }) as HTMLButtonElement).disabled).toBe(true);
      cleanup();
    }
    render(<RefundPaymentDialog paymentId={ID} state="refunded" amountInr={1200} />);
    expect(screen.getByText("This payment is already refunded.")).toBeTruthy();
  });

  it("is enabled for paid and refund_failed", () => {
    for (const state of ["paid", "refund_failed"] as const) {
      render(<RefundPaymentDialog paymentId={ID} state={state} amountInr={1200} />);
      expect((screen.getByRole("button", { name: "Refund INR 1,200" }) as HTMLButtonElement).disabled).toBe(false);
      cleanup();
    }
  });

  it("needs a reason of at least 10 characters before the confirm step", () => {
    open();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert").textContent).toMatch(/at least 10 characters/);
    expect(screen.queryByText(/in full\?/)).toBeNull();
    expect(mocks.refundPaymentAction).not.toHaveBeenCalled();
  });

  it("confirms, then calls the action with the id and reason and shows the returned state", async () => {
    mocks.refundPaymentAction.mockResolvedValue({
      ok: true,
      data: { outcome: "requested", state: "refund_requested", refundId: "rfnd_1" },
    });
    open();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Client asked twice by email" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/in full\?/)).toBeTruthy();
    expect(screen.getByText("Reason: Client asked twice by email")).toBeTruthy();
    expect(mocks.refundPaymentAction).not.toHaveBeenCalled();

    const confirm = screen.getAllByRole("button", { name: "Refund INR 1,200" }).at(-1) as HTMLElement;
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(mocks.refundPaymentAction).toHaveBeenCalledWith({ paymentId: ID, reason: "Client asked twice by email" }),
    );
    expect((await screen.findByRole("status")).textContent).toMatch(/now refund requested/);
  });

  it("shows the state the function reported when Razorpay refuses", async () => {
    mocks.refundPaymentAction.mockResolvedValue({
      ok: true,
      data: { outcome: "provider_error", state: "refund_failed", message: "Razorpay did not accept the request." },
    });
    open("refund_failed");
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Retry after the bank fix" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Refund INR 1,200" }).at(-1) as HTMLElement);
    expect((await screen.findByRole("status")).textContent).toMatch(/The payment is refund failed\./);
  });
});

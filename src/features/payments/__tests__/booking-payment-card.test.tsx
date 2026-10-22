import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BookingPaymentCard } from "@/features/payments/components/booking-payment-card";
import { paymentRow } from "./fixtures";

afterEach(cleanup);

describe("BookingPaymentCard", () => {
  it("shows the payment's state, amount and a link to it", () => {
    const payment = paymentRow({ state: "refund_pending", amount_inr: 1500 });
    render(<BookingPaymentCard state={{ kind: "ok", payment }} permissions={["bookings.read", "payments.read"]} />);
    expect(screen.getByRole("heading", { name: "Payment" })).toBeTruthy();
    expect(screen.getByText("Refund pending")).toBeTruthy();
    expect(screen.getByText("INR 1,500")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open payment" }).getAttribute("href")).toBe(`/payments/${payment.id}`);
  });

  it("says a booking without a payment is a legacy booking", () => {
    render(<BookingPaymentCard state={{ kind: "none" }} permissions={["payments.read"]} />);
    expect(screen.getByText("No payment (legacy booking)")).toBeTruthy();
  });

  it("names the missing key instead of claiming there is no payment", () => {
    render(
      <BookingPaymentCard
        state={{ kind: "hidden", reason: "The payment needs the View payments permission (payments.read)." }}
        permissions={["bookings.read"]}
      />,
    );
    expect(screen.queryByText("No payment (legacy booking)")).toBeNull();
    expect(screen.getByText(/payments\.read/)).toBeTruthy();
  });
});

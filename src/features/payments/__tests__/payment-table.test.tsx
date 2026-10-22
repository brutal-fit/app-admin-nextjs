import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { PaymentFilters } from "@/features/payments/components/payment-filters";
import { PaymentTable } from "@/features/payments/components/payment-table";
import { EMPTY_PAYMENT_FILTERS, PAYMENT_STATE_LABELS, parsePaymentFilters } from "@/features/payments/schemas";
import { BOOKING_ID, NOW, paymentBooking, paymentsInEveryState } from "./fixtures";

afterEach(cleanup);

const LINKS = { bookings: true, users: true, trainers: true, gyms: true };

function rowOf(orderId: string): HTMLElement {
  return screen.getByText(orderId).closest("tr") as HTMLElement;
}

describe("PaymentTable", () => {
  it("renders a payment in each of the seven states with its badge, order id and booking", () => {
    render(
      <PaymentTable
        rows={paymentsInEveryState()}
        bookings={{ visible: true, bookings: { [BOOKING_ID]: paymentBooking() } }}
        links={LINKS}
        now={NOW}
        filtered={false}
      />,
    );
    expect(screen.getByText("7 payments on this page")).toBeTruthy();
    for (const label of Object.values(PAYMENT_STATE_LABELS)) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    const created = within(rowOf("order_State0"));
    expect(created.getByText("Created")).toBeTruthy();
    expect(created.getByText("None yet")).toBeTruthy();
    expect(created.getByRole("button", { name: "Copy order id order_State0" })).toBeTruthy();
    expect(created.getByRole("link", { name: "Priya Shah" }).getAttribute("href")).toBe(
      "/users/c1111111-1111-4111-8111-111111111111",
    );
    expect(created.getByText("Rahul Verma")).toBeTruthy();
  });

  it("marks only the failed refund and the stale queued refund as needing attention", () => {
    render(
      <PaymentTable
        rows={paymentsInEveryState()}
        bookings={{ visible: true, bookings: {} }}
        links={LINKS}
        now={NOW}
        filtered={false}
      />,
    );
    expect(screen.getAllByText("Needs attention")).toHaveLength(2);
    expect(within(rowOf("order_State3")).getByText("Needs attention")).toBeTruthy();
    expect(within(rowOf("order_State6")).getByText("Needs attention")).toBeTruthy();
    expect(within(rowOf("order_State1")).queryByText("Needs attention")).toBeNull();
  });

  it("hides the parties without bookings.read and shows a gym booking's gym", () => {
    const [first] = paymentsInEveryState();
    render(
      <PaymentTable rows={[first]} bookings={{ visible: false }} links={LINKS} now={NOW} filtered={false} />,
    );
    expect(screen.getAllByText("Hidden")).toHaveLength(2);
    cleanup();
    render(
      <PaymentTable
        rows={[first]}
        bookings={{
          visible: true,
          bookings: {
            [BOOKING_ID]: paymentBooking({ gymId: "g1", gymName: "Iron Temple", trainerId: null, trainerName: null }),
          },
        }}
        links={LINKS}
        now={NOW}
        filtered={false}
      />,
    );
    expect(screen.getByRole("link", { name: "Iron Temple" }).getAttribute("href")).toBe("/gyms/g1");
    expect(screen.getByText("Awaiting gym allotment")).toBeTruthy();
  });
});

describe("PaymentFilters", () => {
  it("shows the Needs attention chip as current when the filter is on", () => {
    render(
      <PaymentFilters filters={parsePaymentFilters({ attention: "yes" })} range={{ from: null, to: null }} />,
    );
    const chip = screen.getByRole("link", { name: "Needs attention" });
    expect(chip.getAttribute("aria-current")).toBe("page");
    expect(chip.getAttribute("href")).toBe("/payments");
    expect(screen.getByRole("link", { name: "Refund failed" }).getAttribute("href")).toBe("/payments?state=refund_failed");
  });

  it("links Needs attention without a state and shows the default dates", () => {
    render(
      <PaymentFilters
        filters={{ ...EMPTY_PAYMENT_FILTERS, state: "paid" }}
        range={{ from: "2026-09-23", to: "2026-10-22" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Needs attention" }).getAttribute("href")).toBe("/payments?attention=yes");
    expect((screen.getByLabelText("From") as HTMLInputElement).value).toBe("2026-09-23");
    expect((screen.getByLabelText("To") as HTMLInputElement).value).toBe("2026-10-22");
  });
});

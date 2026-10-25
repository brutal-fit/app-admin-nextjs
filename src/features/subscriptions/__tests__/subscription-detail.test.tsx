import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubscriptionDetail } from "@/features/subscriptions/components/subscription-detail";
import { NAMES, PAYMENT_ID, periodRow, subscriptionRow } from "./fixtures";

afterEach(cleanup);

const SESSION = {
  id: "a7777777-7777-4777-8777-777777777777",
  startAt: "2026-10-20T01:30:00Z",
  endAt: "2026-10-20T02:30:00Z",
  status: "confirmed" as const,
  paymentStatus: "paid" as const,
  clientName: "Priya Shah",
  trainerName: "Rahul Verma",
};

function renderDetail(permissions: string[]) {
  render(
    <SubscriptionDetail
      subscription={subscriptionRow()}
      slots={[
        { subscription_id: "x", weekday: 3, start_minute: 420 },
        { subscription_id: "x", weekday: 1, start_minute: 420 },
      ]}
      periods={[
        periodRow(),
        periodRow({ id: "a4444444-4444-4444-8444-444444444442", seq: 2, status: "unpaid", payment_id: null, starts_on: "2026-11-17", ends_on: "2026-12-14" }),
      ]}
      sessions={[SESSION]}
      names={NAMES}
      permissions={permissions}
    />,
  );
}

describe("SubscriptionDetail", () => {
  it("renders the plan, slots, periods with their payment state and links, and the sessions", () => {
    renderDetail(["bookings.read", "payments.read", "users.read", "trainers.read"]);
    expect(screen.getByText("Mon 07:00, Wed 07:00")).toBeTruthy();
    expect(screen.getByText("Period 1")).toBeTruthy();
    expect(screen.getByText("Period 2")).toBeTruthy();
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getByText("Unpaid")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Payment" }).getAttribute("href")).toBe(`/payments/${PAYMENT_ID}`);
    expect(screen.getByText("No payment yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: /20 Oct/ }).getAttribute("href")).toBe(`/bookings/${SESSION.id}`);
    expect(screen.getByRole("link", { name: "Priya Shah" })).toBeTruthy();
  });

  it("names payments.read instead of linking a payment without it", () => {
    renderDetail(["bookings.read"]);
    expect(screen.queryByRole("link", { name: "Payment" })).toBeNull();
    expect(screen.getByText(/needs the View payments permission \(payments.read\)/)).toBeTruthy();
  });

  it("shows who cancelled and why", () => {
    render(
      <SubscriptionDetail
        subscription={subscriptionRow({ status: "cancelled", cancelled_by: "admin", cancellation_reason: "Trainer left the city" })}
        slots={[]}
        periods={[]}
        sessions={[]}
        names={NAMES}
        permissions={["bookings.read"]}
      />,
    );
    expect(screen.getByText("By BRUTAL: Trainer left the city")).toBeTruthy();
    expect(screen.getByText("No periods yet.")).toBeTruthy();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CoachingDetail } from "@/features/coaching/components/coaching-detail";
import { NAMES, PAYMENT_ID, coachingPeriodRow, coachingRow } from "@/features/subscriptions/__tests__/fixtures";

afterEach(cleanup);

const PERIODS = [
  coachingPeriodRow(),
  coachingPeriodRow({ id: "a6666666-6666-4666-8666-666666666662", seq: 2, status: "unpaid", payment_id: null, starts_on: "2026-11-20", ends_on: "2026-12-19" }),
];

describe("CoachingDetail", () => {
  it("renders the months with their payment state and links, and the chat with a support link", () => {
    render(
      <CoachingDetail
        coaching={coachingRow()}
        periods={PERIODS}
        names={NAMES}
        planTitle="Strong in 8"
        permissions={["bookings.read", "payments.read", "support.read", "users.read"]}
      />,
    );
    expect(screen.getByText("Month 1")).toBeTruthy();
    expect(screen.getByText("Month 2")).toBeTruthy();
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getByText("Unpaid")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Payment" }).getAttribute("href")).toBe(`/payments/${PAYMENT_ID}`);
    expect(screen.getByText("Strong in 8")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copy chat id/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Support cases from this client" }).getAttribute("href")).toBe(
      "/support?q=Priya%20Shah",
    );
  });

  it("says when no chat exists yet and shows who ended it", () => {
    render(
      <CoachingDetail
        coaching={coachingRow({ conversation_id: null, status: "cancelled", cancelled_by: "coach", cancellation_reason: "Client stopped replying" })}
        periods={[]}
        names={NAMES}
        planTitle={null}
        permissions={["bookings.read"]}
      />,
    );
    expect(screen.getByText("No chat yet; it opens when month 1 is paid.")).toBeTruthy();
    expect(screen.getByText("By the coach: Client stopped replying")).toBeTruthy();
    expect(screen.getByText("Plan a2222222 (retired or hidden)")).toBeTruthy();
  });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubscriptionTable } from "@/features/subscriptions/components/subscription-table";
import { SUBSCRIPTION_STATUS_LABELS } from "@/features/subscriptions/schemas";
import { ALL_PERIOD_STATUSES, CLIENT_ID, NAMES, TRAINER_ID, periodRow, subscriptionsInEveryStatus } from "./fixtures";

afterEach(cleanup);

const LINKS = { users: true, trainers: true };

describe("SubscriptionTable", () => {
  it("renders a subscription in each of the five statuses with its parties and current period", () => {
    const items = subscriptionsInEveryStatus().map((subscription, index) => ({
      subscription,
      current: periodRow({ subscription_id: subscription.id, status: ALL_PERIOD_STATUSES[index] ?? "paid" }),
    }));
    render(<SubscriptionTable items={items} names={NAMES} links={LINKS} filtered={false} />);
    expect(screen.getByText("5 subscriptions on this page")).toBeTruthy();
    for (const label of Object.values(SUBSCRIPTION_STATUS_LABELS)) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    for (const label of ["Unpaid", "Paid", "Refund pending", "Refunded", "Lapsed"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    const row = within(screen.getAllByRole("row")[1] as HTMLElement);
    expect(row.getByRole("link", { name: "Priya Shah" }).getAttribute("href")).toBe(`/users/${CLIENT_ID}`);
    expect(row.getByRole("link", { name: "Rahul Verma" }).getAttribute("href")).toBe(`/trainers/${TRAINER_ID}`);
    expect(row.getByText("4 weeks, 3 a week")).toBeTruthy();
    expect(row.getByText("INR 10,800")).toBeTruthy();
  });

  it("links each row to its detail and shows a short reference without a name", () => {
    const [subscription] = subscriptionsInEveryStatus();
    if (!subscription) throw new Error("no fixture");
    render(
      <SubscriptionTable
        items={[{ subscription, current: null }]}
        names={{ clients: {}, trainers: {}, clientNote: null }}
        links={{ users: false, trainers: false }}
        filtered={false}
      />,
    );
    expect(screen.getAllByRole("link")[0]?.getAttribute("href")).toBe(`/subscriptions/${subscription.id}`);
    expect(screen.getByText("Client c1111111")).toBeTruthy();
    expect(screen.getByText("No periods")).toBeTruthy();
  });

  it("says when nothing matches the filters", () => {
    render(<SubscriptionTable items={[]} names={NAMES} links={LINKS} filtered />);
    expect(screen.getByText("No subscription matches these filters.")).toBeTruthy();
  });
});

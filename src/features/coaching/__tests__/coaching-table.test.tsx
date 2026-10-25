import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CoachingTable } from "@/features/coaching/components/coaching-table";
import { COACHING_STATUS_LABELS } from "@/features/coaching/schemas";
import type { CoachingStatus } from "@/types/database";
import {
  ALL_PERIOD_STATUSES,
  CLIENT_ID,
  NAMES,
  PLAN_ID,
  TRAINER_ID,
  coachingPeriodRow,
  coachingRow,
} from "@/features/subscriptions/__tests__/fixtures";

afterEach(cleanup);

const LINKS = { users: true, trainers: true };
const STATUSES: CoachingStatus[] = ["requested", "active", "cancelled", "expired"];

describe("CoachingTable", () => {
  it("renders a coaching in each status with client, coach, plan and current month", () => {
    const items = STATUSES.map((status, index) => {
      const coaching = coachingRow({ id: `f${index}111111-1111-4111-8111-111111111111`, status });
      return { coaching, current: coachingPeriodRow({ coaching_id: coaching.id, status: ALL_PERIOD_STATUSES[index] ?? "paid" }) };
    });
    render(
      <CoachingTable items={items} names={NAMES} planTitles={{ [PLAN_ID]: "Strong in 8" }} links={LINKS} filtered={false} />,
    );
    expect(screen.getByText("4 coachings on this page")).toBeTruthy();
    for (const label of Object.values(COACHING_STATUS_LABELS)) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    for (const label of ["Unpaid", "Paid", "Refund pending", "Refunded"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    const row = within(screen.getAllByRole("row")[1] as HTMLElement);
    expect(row.getByRole("link", { name: "Priya Shah" }).getAttribute("href")).toBe(`/users/${CLIENT_ID}`);
    expect(row.getByRole("link", { name: "Rahul Verma" }).getAttribute("href")).toBe(`/trainers/${TRAINER_ID}`);
    expect(row.getByText("Strong in 8")).toBeTruthy();
    expect(row.getByText("INR 1,500")).toBeTruthy();
  });

  it("shows a short plan reference when the title is not readable", () => {
    render(
      <CoachingTable
        items={[{ coaching: coachingRow(), current: null }]}
        names={NAMES}
        planTitles={{}}
        links={LINKS}
        filtered={false}
      />,
    );
    expect(screen.getByText("Plan a2222222")).toBeTruthy();
    expect(screen.getByText("No months")).toBeTruthy();
  });
});

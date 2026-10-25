import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CustomPlanList } from "@/features/coaching/components/custom-plan-list";
import { CLIENT_ID, NAMES, SUBSCRIPTION_ID, TRAINER_ID } from "@/features/subscriptions/__tests__/fixtures";

afterEach(cleanup);

const PLAN = {
  id: "a8888888-8888-4888-8888-888888888888",
  trainer_id: TRAINER_ID,
  client_id: CLIENT_ID,
  subscription_id: SUBSCRIPTION_ID,
  coaching_id: null,
  title: "Knee-friendly strength",
  weeks: 4,
  status: "active" as const,
  notes: null,
  starts_on: "2026-10-19",
  created_at: "2026-10-19T04:00:00Z",
  updated_at: "2026-10-19T04:00:00Z",
};

const DAY = {
  id: "a9999999-9999-4999-8999-999999999999",
  plan_id: PLAN.id,
  week: 1,
  weekday: 2,
  title: "Lower body",
  notes: null,
  created_at: "2026-10-19T04:00:00Z",
  updated_at: "2026-10-19T04:00:00Z",
};

const ITEM = {
  id: "b9999999-9999-4999-8999-999999999999",
  day_id: DAY.id,
  exercise_id: "c9999999-9999-4999-8999-999999999999",
  seq: 1,
  sets: 3,
  reps: 12,
  duration_seconds: null,
  rest_seconds: 60,
  notes: null,
};

describe("CustomPlanList", () => {
  it("renders a plan with its client, source, days and exercises on the trainer page", () => {
    render(
      <CustomPlanList
        state={{ kind: "ok", names: NAMES, plans: [{ plan: PLAN, days: [{ day: DAY, items: [{ item: ITEM, exerciseName: "Goblet squat" }] }] }] }}
        side="trainer"
        permissions={["users.read", "bookings.read", "catalogue.manage"]}
      />,
    );
    expect(screen.getByText("Knee-friendly strength")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Priya Shah" }).getAttribute("href")).toBe(`/users/${CLIENT_ID}`);
    expect(screen.getByRole("link", { name: "From a subscription" }).getAttribute("href")).toBe(
      `/subscriptions/${SUBSCRIPTION_ID}`,
    );
    expect(screen.getByText("Week 1, Tue: Lower body")).toBeTruthy();
    expect(screen.getByText("Goblet squat: 3 x 12, rest 60 s")).toBeTruthy();
  });

  it("names catalogue.manage when the plans are hidden", () => {
    render(
      <CustomPlanList
        state={{ kind: "hidden", reason: "Custom plans needs the Manage the catalogue and platform settings permission (catalogue.manage)." }}
        side="client"
        permissions={[]}
      />,
    );
    expect(screen.getByText(/\(catalogue.manage\)/)).toBeTruthy();
  });
});

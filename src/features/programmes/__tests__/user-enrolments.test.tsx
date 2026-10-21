import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UserEnrolments } from "@/features/users/components/user-enrolments";
import type { AdminEnrolment } from "@/lib/db/programmes";

afterEach(cleanup);

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const BOOKING = "33333333-3333-4333-8333-333333333333";

const base: AdminEnrolment = {
  id: "e1",
  client_id: USER,
  client_name: "Asha",
  trainer_id: OTHER,
  trainer_name: "Ravi",
  plan_id: "p1",
  plan_title: "Home starter",
  plan_weeks: 4,
  stage: "assessment_booked",
  payment_status: "pilot_free",
  enrolled_at: "2026-10-20T06:00:00Z",
  started_on: null,
  cancelled_at: null,
  assessment: { booking_id: BOOKING, start: "2026-10-22T06:00:00Z", status: "confirmed" },
  checks_done: 3,
};

describe("UserEnrolments", () => {
  it("shows the empty state without rows", () => {
    render(<UserEnrolments userId={USER} rows={[]} permissions={[]} />);
    expect(screen.getByText("No programme enrolments.")).toBeTruthy();
  });

  it("shows the error instead of the list", () => {
    render(<UserEnrolments userId={USER} rows={[base]} error="Could not load." permissions={[]} />);
    expect(screen.getByRole("alert").textContent).toBe("Could not load.");
    expect(screen.queryByText("Home starter")).toBeNull();
  });

  it("renders plan, stage, trainer and a booking link with bookings.read", () => {
    render(<UserEnrolments userId={USER} rows={[base]} permissions={["bookings.read", "users.read"]} />);
    expect(screen.getByText("Home starter")).toBeTruthy();
    expect(screen.getByText("Assessment booked")).toBeTruthy();
    expect(screen.getByText("Trainer")).toBeTruthy();
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain(`/bookings/${BOOKING}`);
    expect(hrefs).toContain(`/users/${OTHER}`);
    expect(screen.getByText("Free during the pilot")).toBeTruthy();
    expect(screen.getByText("Not started")).toBeTruthy();
  });

  it("renders no links without permissions", () => {
    render(<UserEnrolments userId={USER} rows={[base]} permissions={[]} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("Ravi")).toBeTruthy();
  });

  it("marks the trainer view and an unbooked assessment", () => {
    const row: AdminEnrolment = { ...base, client_id: OTHER, trainer_id: USER, assessment: null, stage: "active" };
    render(<UserEnrolments userId={USER} rows={[row]} permissions={[]} />);
    expect(screen.getByText("As trainer")).toBeTruthy();
    expect(screen.getByText("Client")).toBeTruthy();
    expect(screen.getByText("Not booked")).toBeTruthy();
  });

  it("shows Not assigned when no trainer and a cancelled date", () => {
    const row: AdminEnrolment = {
      ...base,
      trainer_id: null,
      trainer_name: null,
      assessment: null,
      stage: "cancelled",
      cancelled_at: "2026-10-21T06:00:00Z",
    };
    render(<UserEnrolments userId={USER} rows={[row]} permissions={[]} />);
    expect(screen.getByText("Not assigned")).toBeTruthy();
    expect(screen.getByText("Cancelled", { selector: "dt" })).toBeTruthy();
  });
});

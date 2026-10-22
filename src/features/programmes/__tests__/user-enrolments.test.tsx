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
    expect(screen.getByText("No programmes started.")).toBeTruthy();
  });

  it("shows the error instead of the list", () => {
    render(<UserEnrolments userId={USER} rows={[base]} error="Could not load." permissions={[]} />);
    expect(screen.getByRole("alert").textContent).toBe("Could not load.");
    expect(screen.queryByText("Home starter")).toBeNull();
  });

  it("renders programme rows without trainer or assessment", () => {
    render(<UserEnrolments userId={USER} rows={[base]} permissions={["bookings.read", "users.read"]} />);
    expect(screen.getByText("Programmes")).toBeTruthy();
    expect(screen.getByText("Home starter")).toBeTruthy();
    expect(screen.getByText("Exercises ticked")).toBeTruthy();
    expect(screen.queryByText("Trainer")).toBeNull();
    expect(screen.queryByText("Ravi")).toBeNull();
    expect(screen.queryByText("Assessment")).toBeNull();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryByText("As trainer")).toBeNull();
  });

  it("marks a legacy row where this user was the trainer and links the client with users.read", () => {
    const row: AdminEnrolment = { ...base, client_id: OTHER, trainer_id: USER, client_name: "Meera", stage: "active" };
    render(<UserEnrolments userId={USER} rows={[row]} permissions={["users.read"]} />);
    expect(screen.getByText("As trainer")).toBeTruthy();
    expect(screen.getByText("Client")).toBeTruthy();
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain(`/users/${OTHER}`);
  });

  it("shows the cancelled date", () => {
    const row: AdminEnrolment = { ...base, stage: "cancelled", cancelled_at: "2026-10-21T06:00:00Z" };
    render(<UserEnrolments userId={USER} rows={[row]} permissions={[]} />);
    expect(screen.getByText("Cancelled", { selector: "dt" })).toBeTruthy();
  });
});

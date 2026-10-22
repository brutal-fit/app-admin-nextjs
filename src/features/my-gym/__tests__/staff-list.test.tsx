import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/my-gym/actions", () => ({ removeStaffAction: vi.fn() }));
vi.mock("@/stores/toast-store", () => ({ showToast: vi.fn() }));

import { z } from "zod";
import { StaffList } from "@/features/my-gym/components/staff-list";
import { gymStaffSchema } from "@/lib/db/gyms-manager";

afterEach(cleanup);

const GYM = "11111111-1111-4111-8111-111111111111";
const SELF = "22222222-2222-4222-8222-222222222222";
const TRAINER = "33333333-3333-4333-8333-333333333333";

// A gym_list_staff reply (private.gym_staff_json rows), parsed as the data layer parses it.
const fixture = z.array(gymStaffSchema).parse([
  {
    id: "a1111111-1111-4111-8111-111111111111",
    gym_id: GYM,
    user_id: SELF,
    name: "Asha Rao",
    phone: "+919876543211",
    role: "manager",
    status: "active",
    invited_at: "2026-10-20T10:00:00Z",
    joined_at: "2026-10-20T11:00:00Z",
    removed_at: null,
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    gym_id: GYM,
    user_id: TRAINER,
    name: "Rahul Verma",
    phone: "+919876543210",
    role: "trainer",
    status: "active",
    invited_at: "2026-10-21T10:00:00Z",
    joined_at: "2026-10-21T12:00:00Z",
    removed_at: null,
  },
  {
    id: "a3333333-3333-4333-8333-333333333333",
    gym_id: GYM,
    user_id: null,
    name: null,
    phone: "+919876543213",
    role: "trainer",
    status: "invited",
    invited_at: "2026-10-22T10:00:00Z",
    joined_at: null,
    removed_at: null,
  },
]);

describe("StaffList", () => {
  it("shows each member's name, phone, role and status from gym_list_staff", () => {
    render(<StaffList staff={fixture} selfUserId={SELF} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);

    const trainer = within(rows.find((row) => row.textContent?.includes("Rahul Verma")) as HTMLElement);
    expect(trainer.getByText("+91 98765 43210")).toBeTruthy();
    expect(trainer.getByText("Trainer")).toBeTruthy();
    expect(trainer.getByText("Active")).toBeTruthy();

    expect(screen.getByText("Asha Rao")).toBeTruthy();
    expect(screen.getByText("(you)")).toBeTruthy();
  });

  it("says an invite has not joined yet instead of a name", () => {
    render(<StaffList staff={fixture} selfUserId={SELF} />);
    const invited = within(screen.getAllByRole("row").find((row) => row.textContent?.includes("+91 98765 43213")) as HTMLElement);
    expect(invited.getByText("Joins on sign-in")).toBeTruthy();
    expect(invited.getByText("Invited")).toBeTruthy();
  });

  it("names the member on the remove button", () => {
    render(<StaffList staff={fixture} selfUserId={SELF} />);
    expect(screen.getByRole("button", { name: "Remove trainer Rahul Verma" })).toBeTruthy();
  });
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { allotTrainerAction, showToast } = vi.hoisted(() => ({
  allotTrainerAction: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/features/my-gym/actions", () => ({ allotTrainerAction }));
vi.mock("@/stores/toast-store", () => ({ showToast }));

import { AllotTrainerForm } from "@/features/my-gym/components/allot-trainer-form";
import { allotCandidates } from "@/features/my-gym/format";
import { allotTrainerSchema } from "@/features/my-gym/schemas";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const BOOKING = "11111111-1111-4111-8111-111111111111";
const T1 = "22222222-2222-4222-8222-222222222222";
const T2 = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  allotTrainerAction.mockReset();
  showToast.mockReset();
});
afterEach(cleanup);

describe("allotCandidates", () => {
  const staff = [
    { user_id: T1, phone: "+919876543210", role: "trainer", status: "active" },
    { user_id: T2, phone: "+919876543211", role: "manager", status: "active" },
    { user_id: "44444444-4444-4444-8444-444444444444", phone: "+919876543212", role: "trainer", status: "removed" },
    { user_id: null, phone: "+919876543213", role: "trainer", status: "active" },
    { user_id: "55555555-5555-4555-8555-555555555555", phone: "+919876543214", role: "trainer", status: "invited" },
  ] as unknown as Parameters<typeof allotCandidates>[0];

  it("keeps only active, bound trainers", () => {
    expect(allotCandidates(staff).map((option) => option.userId)).toEqual([T1]);
  });

  it("excludes the current trainer on reassign", () => {
    expect(allotCandidates(staff, T1)).toEqual([]);
  });
});

describe("allotTrainerSchema", () => {
  it("rejects a free-text trainer and accepts a guid", () => {
    expect(allotTrainerSchema.safeParse({ bookingId: BOOKING, trainerUserId: "Rahul", kind: "allot" }).success).toBe(false);
    expect(allotTrainerSchema.safeParse({ bookingId: BOOKING, trainerUserId: T1, kind: "allot" }).success).toBe(true);
  });
});

describe("AllotTrainerForm", () => {
  it("shows no picker and says why when the gym has no active trainer", () => {
    render(<AllotTrainerForm bookingId={BOOKING} kind="allot" options={[]} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText(/No active trainer on your staff/)).toBeTruthy();
  });

  it("disables the submit button until a trainer is picked", () => {
    render(<AllotTrainerForm bookingId={BOOKING} kind="allot" options={[{ userId: T1, label: "+91 98765 43210" }]} />);
    const button = screen.getByRole("button", { name: "Allot and confirm" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(allotTrainerAction).not.toHaveBeenCalled();
  });

  it("labels the reassign variant", () => {
    render(<AllotTrainerForm bookingId={BOOKING} kind="reassign" options={[{ userId: T1, label: "x" }]} />);
    expect(screen.getByRole("button", { name: "Reassign" })).toBeTruthy();
  });
});

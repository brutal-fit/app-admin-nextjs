import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BookingTable } from "@/features/bookings/components/booking-table";
import type { BookingListRow } from "@/lib/db/bookings";

afterEach(cleanup);

function row(overrides: Partial<BookingListRow>): BookingListRow {
  return {
    id: "b1111111-1111-4111-8111-111111111111",
    client_id: "c1111111-1111-4111-8111-111111111111",
    client_name: "Priya Shah",
    trainer_id: "t1111111-1111-4111-8111-111111111111",
    trainer_name: "Rahul Verma",
    mode: "home",
    start_at: "2026-10-24T01:30:00Z",
    end_at: "2026-10-24T02:30:00Z",
    status: "confirmed",
    payment_status: "pending",
    price_snapshot_inr: 900,
    has_address: false,
    dispute: null,
    created_at: "2026-10-22T08:00:00Z",
    ...overrides,
  };
}

describe("BookingTable", () => {
  it("shows a gym booking without a trainer as awaiting allotment, with the gym name", () => {
    const gymBooking = row({ id: "b2222222-2222-4222-8222-222222222222", trainer_id: null, trainer_name: null, status: "requested" });
    render(
      <BookingTable
        rows={[row({}), gymBooking]}
        avatars={{}}
        gymNames={{ [gymBooking.id]: "Iron Temple Indiranagar" }}
        filtered={false}
        usersVisible
        trainersVisible
      />,
    );
    const awaiting = screen.getByText("Awaiting gym allotment");
    const cell = within(awaiting.closest("td") as HTMLElement);
    expect(cell.getByText("Iron Temple Indiranagar")).toBeTruthy();
    expect(cell.queryByRole("link")).toBeNull();
    expect(screen.getByRole("link", { name: "Rahul Verma" }).getAttribute("href")).toBe(
      "/trainers/t1111111-1111-4111-8111-111111111111",
    );
  });

  it("still renders the row when the gym name could not be read", () => {
    render(
      <BookingTable
        rows={[row({ trainer_id: null, trainer_name: null })]}
        avatars={{}}
        filtered={false}
        usersVisible={false}
        trainersVisible={false}
      />,
    );
    expect(screen.getByText("Awaiting gym allotment")).toBeTruthy();
  });
});

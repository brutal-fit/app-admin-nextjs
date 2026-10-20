import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BookingTimeline } from "@/features/bookings/components/booking-timeline";
import type { BookingTimelineEvent } from "@/lib/db/bookings";

afterEach(cleanup);

const timeline: BookingTimelineEvent[] = [
  { event: "created", at: "2026-10-20T08:00:00Z", by: "client", actorName: "Asha", outcome: null, note: null },
  { event: "confirmed", at: "2026-10-20T09:00:00Z", by: "trainer", actorName: "Ravi", outcome: null, note: null },
  { event: "completed", at: "2026-10-20T12:00:00Z", by: "trainer", actorName: "Ravi", outcome: null, note: null },
];

function renderTimeline(arrivedAt: string | null) {
  return render(
    <BookingTimeline
      booking={{ status: "completed", requested_start_at: null, arrived_at: arrivedAt }}
      timeline={timeline}
      dispute={null}
      permissions={[]}
    />,
  );
}

describe("BookingTimeline arrived step", () => {
  it("shows Trainer arrived between confirmation and completion when arrived_at is set", () => {
    renderTimeline("2026-10-20T10:30:00Z");
    const titles = screen.getAllByRole("listitem").map((li) => li.querySelector("span.font-medium")?.textContent);
    expect(titles).toEqual(["Requested", "Confirmed", "Trainer arrived", "Completed"]);
  });

  it("omits the step when arrived_at is null", () => {
    renderTimeline(null);
    expect(screen.queryByText("Trainer arrived")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("appends the step when it is later than every timeline event", () => {
    renderTimeline("2026-10-20T13:00:00Z");
    const items = screen.getAllByRole("listitem");
    expect(items[items.length - 1].textContent).toContain("Trainer arrived");
  });
});

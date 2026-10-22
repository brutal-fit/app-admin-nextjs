import { formatSessionRange } from "@/features/bookings/format";
import { firstName } from "@/features/gyms/format";
import { AllotTrainerForm } from "@/features/my-gym/components/allot-trainer-form";
import type { TrainerOption } from "@/features/my-gym/format";
import type { BookingDetailsRow } from "@/types/database";

const MODE = { home: "At the gym", online: "Online" } as const;

/**
 * Confirmed sessions that have not started, soonest first, with the trainer they are allotted
 * to and a reassign form (gym_reassign_trainer refuses once the session has started).
 */
export function ReassignList({
  bookings,
  staffOptions,
}: {
  bookings: readonly BookingDetailsRow[];
  staffOptions: readonly TrainerOption[];
}) {
  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">No confirmed sessions coming up.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {bookings.map((booking) => (
        <li key={booking.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-tile">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{formatSessionRange(booking.start_at, booking.end_at)}</p>
            <p className="text-sm text-muted-foreground">
              {booking.service_title}, {MODE[booking.mode]}. Client: {firstName(booking.client_name)}. Trainer:{" "}
              {booking.trainer_name ?? "not allotted"}.
            </p>
          </div>
          <AllotTrainerForm
            bookingId={booking.id}
            kind="reassign"
            options={staffOptions.filter((option) => option.userId !== booking.trainer_id)}
          />
        </li>
      ))}
    </ul>
  );
}

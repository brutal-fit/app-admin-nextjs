import { Inbox } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { formatInr } from "@/features/applications/format";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { formatSessionRange } from "@/features/bookings/format";
import { AllotTrainerForm } from "@/features/my-gym/components/allot-trainer-form";
import { DeclineRequestDialog } from "@/features/my-gym/components/decline-request-dialog";
import type { TrainerOption } from "@/features/my-gym/format";
import type { GymRequestRow } from "@/types/database";

const MODE = { home: "At the gym", online: "Online" } as const;

/**
 * Requests waiting on the gym, soonest first, from gym_list_requests: slot, service and the
 * client's first name, with allot or decline. A reschedule request is shown with the time the
 * client asked for; the panel does not answer reschedules yet.
 */
export function RequestList({
  requests,
  options,
}: {
  requests: readonly GymRequestRow[];
  options: readonly TrainerOption[];
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No requests waiting"
        description="New booking requests for your gym show here. Allot a trainer to confirm one."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {requests.map((request) => {
        const client = request.client_first_name || "BRUTAL member";
        return (
          <li key={request.booking_id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-tile">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="font-medium">{formatSessionRange(request.start_at, request.end_at)}</p>
                <p className="text-sm text-muted-foreground">
                  {request.service_title}, {MODE[request.mode]}, {request.duration_minutes} min,{" "}
                  {formatInr(request.price_snapshot_inr)}. Client: {client}.
                </p>
              </div>
              <BookingStatusBadge status={request.status} />
            </div>
            {request.status === "requested" ? (
              <div className="flex flex-wrap items-end justify-between gap-3">
                <AllotTrainerForm bookingId={request.booking_id} kind="allot" options={options} />
                <DeclineRequestDialog bookingId={request.booking_id} clientName={client} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {request.trainer_name ? `With ${request.trainer_name}. ` : ""}
                {request.requested_start_at
                  ? `${client} asked to move it to ${formatSessionRange(
                      request.requested_start_at,
                      new Date(
                        new Date(request.requested_start_at).getTime() + request.duration_minutes * 60_000,
                      ).toISOString(),
                    )}. `
                  : ""}
                Answering reschedule requests is not in the panel yet.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

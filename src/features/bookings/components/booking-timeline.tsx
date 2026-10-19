import Link from "next/link";
import type { ReactNode } from "react";
import { formatDateTime } from "@/features/applications/format";
import { formatSessionRange } from "@/features/bookings/format";
import { CANCELLED_BY_LABELS } from "@/features/bookings/schemas";
import { permittedHref } from "@/features/support/format";
import { BOOKING_STATUS_LABELS } from "@/features/users/format";
import type { BookingDispute } from "@/lib/db/bookings";
import { cn } from "@/lib/utils";
import type { BookingRow } from "@/types/database";

type Entry = { key: string; title: string; at: string | null; detail?: ReactNode; tone: string };

/**
 * What happened to the booking, from the columns the table has: when it was requested, the
 * session time, the current status with its last change, and any dispute. Bookings keep no
 * event history, so steps in between (confirmation, reschedules) show only as the current
 * status. Gated by bookings.read.
 */
export function BookingTimeline({
  booking,
  dispute,
  permissions,
}: {
  booking: BookingRow;
  dispute: BookingDispute | null;
  permissions: readonly string[];
}) {
  const entries: Entry[] = [
    { key: "requested", title: "Requested by the client", at: booking.created_at, tone: "bg-foreground/40" },
    {
      key: "session",
      title: `Session ${formatSessionRange(booking.start_at, booking.end_at)}`,
      at: null,
      detail:
        booking.status === "reschedule_requested" && booking.requested_start_at
          ? `The client asked to move it to ${formatDateTime(booking.requested_start_at)}.`
          : undefined,
      tone: "bg-foreground/40",
    },
  ];
  if (booking.status !== "requested") {
    entries.push({
      key: "status",
      title:
        booking.status === "cancelled" && booking.cancelled_by
          ? CANCELLED_BY_LABELS[booking.cancelled_by]
          : `Now ${BOOKING_STATUS_LABELS[booking.status].toLowerCase()}`,
      at: booking.updated_at,
      detail: "Time of the last change to the booking.",
      tone: booking.status === "cancelled" || booking.status === "no_show" ? "bg-destructive" : "bg-primary",
    });
  }
  if (dispute) {
    const caseHref = dispute.caseId ? permittedHref(permissions, `/support/${dispute.caseId}`) : null;
    entries.push({
      key: "dispute",
      title: dispute.state === "open" ? "Dispute open" : "Dispute resolved",
      at: dispute.state === "resolved" ? dispute.resolvedAt : null,
      detail: (
        <>
          {dispute.state === "resolved" ? (
            <span className="block">
              {dispute.resolvedByName ? `By ${dispute.resolvedByName}. ` : ""}
              {dispute.note}
            </span>
          ) : (
            <span className="block">
              The client contests this session (a disputed payment or an open report on it).
            </span>
          )}
          {caseHref ? (
            <Link href={caseHref} className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline">
              Open the support case
            </Link>
          ) : null}
        </>
      ),
      tone: dispute.state === "open" ? "bg-destructive" : "bg-success",
    });
  }

  return (
    <section aria-labelledby="booking-timeline" className="flex flex-col gap-3">
      <h2 id="booking-timeline" className="text-lg font-semibold">
        Timeline
      </h2>
      <ol className="flex flex-col gap-4 border-l pl-5">
        {entries.map((entry) => (
          <li key={entry.key} className="relative flex flex-col gap-0.5">
            <span
              aria-hidden="true"
              className={cn("absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full", entry.tone)}
            />
            <span className="text-sm font-medium">{entry.title}</span>
            {entry.at ? <span className="text-xs text-muted-foreground">{formatDateTime(entry.at)}</span> : null}
            {entry.detail ? <div className="text-sm text-muted-foreground">{entry.detail}</div> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

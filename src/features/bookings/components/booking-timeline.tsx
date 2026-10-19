import Link from "next/link";
import type { ReactNode } from "react";
import { formatDateTime } from "@/features/applications/format";
import { permittedHref } from "@/features/support/format";
import { BOOKING_STATUS_LABELS } from "@/features/users/format";
import type { BookingDispute, BookingTimelineEvent } from "@/lib/db/bookings";
import { cn } from "@/lib/utils";
import type { BookingRow, BookingStatus } from "@/types/database";

type Entry = { key: string; title: string; at: string | null; detail?: ReactNode; tone: string };

const EVENT_LABELS: Readonly<Record<string, string>> = {
  created: "Requested",
  confirmed: "Confirmed",
  reschedule_requested: "New time requested",
  rescheduled: "New time accepted",
  reschedule_declined: "New time declined",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "Marked as no-show",
  dispute_resolved: "Dispute resolved",
};

const BY_LABELS: Readonly<Record<string, string>> = {
  client: "client",
  trainer: "trainer",
  admin: "BRUTAL",
};

function eventTone(event: string): string {
  if (event === "cancelled" || event === "no_show") return "bg-destructive";
  if (event === "completed" || event === "dispute_resolved") return "bg-success";
  if (event === "confirmed" || event === "rescheduled") return "bg-primary";
  return "bg-foreground/40";
}

function byLine(entry: BookingTimelineEvent): string {
  const role = BY_LABELS[entry.by] ?? entry.by;
  return entry.actorName ? `By ${entry.actorName} (${role}).` : `By the ${role}.`;
}

function outcomeLabel(outcome: string): string {
  return outcome in BOOKING_STATUS_LABELS
    ? BOOKING_STATUS_LABELS[outcome as BookingStatus]
    : outcome.replaceAll("_", " ");
}

/**
 * What happened to the booking, from admin_get_booking's timeline: requested, confirmed,
 * reschedules, cancelled (with who), completed or no-show, and dispute resolutions, each
 * with who did it; an open dispute closes the list. Gated by bookings.read.
 */
export function BookingTimeline({
  booking,
  timeline,
  dispute,
  permissions,
}: {
  booking: Pick<BookingRow, "status" | "requested_start_at">;
  timeline: readonly BookingTimelineEvent[];
  dispute: BookingDispute | null;
  permissions: readonly string[];
}) {
  // The pending new time belongs to the latest request while the booking still waits on it.
  const pendingRescheduleIndex =
    booking.status === "reschedule_requested" && booking.requested_start_at
      ? timeline.map((entry) => entry.event).lastIndexOf("reschedule_requested")
      : -1;

  const entries: Entry[] = timeline.map((entry, index) => ({
    key: `${entry.event}-${entry.at}-${index}`,
    title: EVENT_LABELS[entry.event] ?? entry.event.replaceAll("_", " "),
    at: entry.at,
    detail: (
      <>
        <span className="block">{byLine(entry)}</span>
        {entry.outcome ? <span className="block">Outcome: {outcomeLabel(entry.outcome)}.</span> : null}
        {index === pendingRescheduleIndex && booking.requested_start_at ? (
          <span className="block">Asked to move it to {formatDateTime(booking.requested_start_at)}.</span>
        ) : null}
        {entry.note ? <span className="block">{entry.note}</span> : null}
      </>
    ),
    tone: eventTone(entry.event),
  }));

  if (dispute?.state === "open") {
    const caseHref = dispute.caseId ? permittedHref(permissions, `/support/${dispute.caseId}`) : null;
    entries.push({
      key: "dispute-open",
      title: "Dispute open",
      at: null,
      detail: (
        <>
          <span className="block">The client contests this session (a disputed payment or an open report on it).</span>
          {caseHref ? (
            <Link href={caseHref} className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline">
              Open the support case
            </Link>
          ) : null}
        </>
      ),
      tone: "bg-destructive",
    });
  }

  return (
    <section aria-labelledby="booking-timeline" className="flex flex-col gap-3">
      <h2 id="booking-timeline" className="text-lg font-semibold">
        Timeline
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events are on record for this booking.</p>
      ) : (
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
      )}
      <p className="text-xs text-muted-foreground">
        Steps come from the notifications each one sent and from the audit log; a step that sent
        neither is not listed.
      </p>
    </section>
  );
}

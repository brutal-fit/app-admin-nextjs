import Link from "next/link";
import { Flag } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/features/applications/format";
import { permittedHref } from "@/features/support/format";
import type { BookingDispute } from "@/lib/db/bookings";

/**
 * The dispute on record, as admin_get_booking reports it: open (a disputed payment or an open
 * report on the session) or resolved with the note, who settled it and when, plus the linked
 * support case when the session may open it. Gated by bookings.read.
 */
export function BookingDisputeCard({
  dispute,
  permissions,
}: {
  dispute: BookingDispute | null;
  permissions: readonly string[];
}) {
  const caseHref = dispute?.caseId ? permittedHref(permissions, `/support/${dispute.caseId}`) : null;
  return (
    <section
      aria-labelledby="booking-dispute"
      className="flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-tile"
    >
      <h2 id="booking-dispute" className="flex items-center gap-2 text-base font-semibold">
        <Flag size={16} aria-hidden="true" />
        Dispute
        {dispute ? (
          <Badge
            variant="outline"
            className={dispute.state === "open" ? "border-destructive text-destructive" : "border-success text-success"}
          >
            {dispute.state === "open" ? "Open" : "Resolved"}
          </Badge>
        ) : null}
      </h2>
      {!dispute ? (
        <p className="text-sm text-muted-foreground">No dispute is on record for this booking.</p>
      ) : dispute.state === "open" ? (
        <p className="text-sm text-muted-foreground">
          The client contests this session (a disputed payment or an open report on it).
        </p>
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          <p>{dispute.note || "No note was recorded."}</p>
          <p className="text-xs text-muted-foreground">
            Resolved {formatDateTime(dispute.resolvedAt)}
            {dispute.resolvedByName ? ` by ${dispute.resolvedByName}` : ""}.
          </p>
        </div>
      )}
      {caseHref ? (
        <Link href={caseHref} className="focus-ring w-fit rounded-sm text-sm font-medium underline-offset-4 hover:underline">
          Open the support case
        </Link>
      ) : dispute?.caseId ? (
        <p className="text-xs text-muted-foreground">A support case is linked; opening it needs View support cases.</p>
      ) : null}
    </section>
  );
}

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/features/applications/format";
import {
  PROGRAMME_STAGE_LABELS,
  formatIsoDate,
  paymentStatusLabel,
  programmeStageTone,
} from "@/features/programmes/format";
import { permittedHref } from "@/features/support/format";
import type { AdminEnrolment } from "@/lib/db/programmes";

const linkClass = "focus-ring rounded-sm font-medium underline-offset-4 hover:underline";

/**
 * Programme enrolments where this user is the client or the trainer, newest first, from
 * admin_list_enrolments: plan, stage, the other party, start date and the assessment booking
 * (linked with bookings.read). Stages are as stored; the app moves a stage on when the client
 * next opens the programme. Gated by users.read, like the page.
 */
export function UserEnrolments({
  userId,
  rows,
  error,
  permissions,
}: {
  userId: string;
  rows: readonly AdminEnrolment[];
  /** Set when the enrolments could not be read; the rest of the page still renders. */
  error?: string | null;
  permissions: readonly string[];
}) {
  return (
    <section aria-labelledby="user-enrolments" className="flex max-w-3xl flex-col gap-3">
      <h2 id="user-enrolments" className="text-lg font-semibold">
        Programmes
      </h2>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No programme enrolments.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const asClient = row.client_id === userId;
            const other = asClient
              ? { label: "Trainer", id: row.trainer_id, name: row.trainer_name }
              : { label: "Client", id: row.client_id, name: row.client_name };
            const otherHref = other.id ? permittedHref(permissions, `/users/${other.id}`) : null;
            const otherName = other.id ? other.name?.trim() || "Unnamed" : "Not assigned";
            const bookingHref = row.assessment
              ? permittedHref(permissions, `/bookings/${row.assessment.booking_id}`)
              : null;
            return (
              <li key={row.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-tile">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.plan_title}</span>
                  <Badge variant="outline" className={programmeStageTone(row.stage)}>
                    {PROGRAMME_STAGE_LABELS[row.stage]}
                  </Badge>
                  {asClient ? null : (
                    <Badge variant="outline" className="text-muted-foreground">
                      As trainer
                    </Badge>
                  )}
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">{other.label}</dt>
                  <dd>
                    {otherHref ? (
                      <Link href={otherHref} className={linkClass}>
                        {otherName}
                      </Link>
                    ) : (
                      otherName
                    )}
                  </dd>
                  <dt className="text-muted-foreground">Enrolled</dt>
                  <dd>{formatDateTime(row.enrolled_at)}</dd>
                  <dt className="text-muted-foreground">Started</dt>
                  <dd>{formatIsoDate(row.started_on)}</dd>
                  <dt className="text-muted-foreground">Assessment</dt>
                  <dd>
                    {row.assessment ? (
                      <>
                        {bookingHref ? (
                          <Link href={bookingHref} className={linkClass}>
                            {formatDateTime(row.assessment.start)}
                          </Link>
                        ) : (
                          formatDateTime(row.assessment.start)
                        )}
                        <span className="text-muted-foreground">{` (${row.assessment.status.replace(/_/g, " ")})`}</span>
                      </>
                    ) : (
                      "Not booked"
                    )}
                  </dd>
                  <dt className="text-muted-foreground">Items ticked</dt>
                  <dd>{row.checks_done}</dd>
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd>{paymentStatusLabel(row.payment_status)}</dd>
                  {row.cancelled_at ? (
                    <>
                      <dt className="text-muted-foreground">Cancelled</dt>
                      <dd>{formatDateTime(row.cancelled_at)}</dd>
                    </>
                  ) : null}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

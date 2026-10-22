import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/features/applications/format";
import {
  PROGRAMME_STAGE_LABELS,
  formatIsoDate,
  formatWeeks,
  paymentStatusLabel,
  programmeStageTone,
} from "@/features/programmes/format";
import { permittedHref } from "@/features/support/format";
import type { AdminEnrolment } from "@/lib/db/programmes";

const linkClass = "focus-ring rounded-sm font-medium underline-offset-4 hover:underline";

/**
 * Programmes this user started, newest first, from admin_list_enrolments: plan, stage,
 * start dates, exercises ticked and payment. Programmes are self-guided since 2026-10-22, so
 * there is no trainer or assessment to show; a row from before then where this user was the
 * trainer is marked and names its client. Stages are as stored; the app moves a stage on
 * when the client next opens the programme. Gated by users.read, like the page.
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
        <p className="text-sm text-muted-foreground">No programmes started.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const asClient = row.client_id === userId;
            const clientHref = asClient ? null : permittedHref(permissions, `/users/${row.client_id}`);
            const clientName = row.client_name?.trim() || "Unnamed";
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
                  {asClient ? null : (
                    <>
                      <dt className="text-muted-foreground">Client</dt>
                      <dd>
                        {clientHref ? (
                          <Link href={clientHref} className={linkClass}>
                            {clientName}
                          </Link>
                        ) : (
                          clientName
                        )}
                      </dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Length</dt>
                  <dd>{formatWeeks(row.plan_weeks)}</dd>
                  <dt className="text-muted-foreground">Enrolled</dt>
                  <dd>{formatDateTime(row.enrolled_at)}</dd>
                  <dt className="text-muted-foreground">Started</dt>
                  <dd>{formatIsoDate(row.started_on)}</dd>
                  <dt className="text-muted-foreground">Exercises ticked</dt>
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

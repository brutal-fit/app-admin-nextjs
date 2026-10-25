import Link from "next/link";
import type { ReactNode } from "react";
import { formatDateTime, formatInr } from "@/features/applications/format";
import { COACHING_CANCELLED_BY_LABELS } from "@/features/coaching/schemas";
import { CopyIdButton } from "@/features/payments/components/copy-id-button";
import { shortId } from "@/features/payments/format";
import { permittedHref } from "@/features/support/format";
import type { PartyNames } from "@/features/subscriptions/api";
import { PeriodStatusBadge } from "@/features/subscriptions/components/period-status-badge";
import { formatDateRange } from "@/features/subscriptions/format";
import { missingPermissionMessage } from "@/features/users/format";
import type { CoachingPeriodRow, ProgrammeCoachingRow } from "@/types/database";

const linkClass = "focus-ring rounded-sm font-medium underline-offset-4 hover:underline";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-tile">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MaybeLink({ href, children }: { href: string | null; children: ReactNode }) {
  return href ? (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  ) : (
    <span className="font-medium">{children}</span>
  );
}

/**
 * The coaching chat. The panel cannot read chats (participants only) and no server path links a
 * chat to its support cases, so it names the thread and links the support queue searched by
 * the client's name, where a reported message from this client shows.
 */
function ChatRow({
  conversationId,
  clientName,
  permissions,
}: {
  conversationId: string | null;
  clientName: string | null;
  permissions: readonly string[];
}) {
  if (!conversationId) return <span className="text-muted-foreground">No chat yet; it opens when month 1 is paid.</span>;
  const supportHref =
    clientName !== null ? permittedHref(permissions, `/support?q=${encodeURIComponent(clientName)}`) : null;
  return (
    <span className="flex flex-col gap-1">
      <CopyIdButton value={conversationId} label="Chat id" />
      {supportHref ? (
        <Link href={supportHref} className={linkClass}>
          Support cases from this client
        </Link>
      ) : permittedHref(permissions, "/support") === null ? (
        <span className="text-xs text-muted-foreground">{missingPermissionMessage("support.read", "Support cases")}</span>
      ) : null}
    </span>
  );
}

/**
 * One coaching: client, coach, plan, fee and dates, the chat, and every month with its payment
 * state and a link to the payment (payments.read). Gated by bookings.read.
 */
export function CoachingDetail({
  coaching,
  periods,
  names,
  planTitle,
  permissions,
}: {
  coaching: ProgrammeCoachingRow;
  periods: readonly CoachingPeriodRow[];
  names: PartyNames;
  planTitle: string | null;
  permissions: readonly string[];
}) {
  const clientName = names.clients[coaching.client_id] ?? null;
  const coachName = names.trainers[coaching.coach_id] ?? `Coach ${shortId(coaching.coach_id)}`;
  const paymentsReadable = permittedHref(permissions, "/payments") !== null;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card id="coaching-summary" title="Coaching">
        <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
          <Row label="Client">
            <MaybeLink href={permittedHref(permissions, `/users/${coaching.client_id}`)}>
              {clientName ?? `Client ${shortId(coaching.client_id)}`}
            </MaybeLink>
          </Row>
          <Row label="Coach">
            <MaybeLink
              href={
                permittedHref(permissions, `/trainers/${coaching.coach_id}`) ??
                permittedHref(permissions, `/users/${coaching.coach_id}`)
              }
            >
              {coachName}
            </MaybeLink>
          </Row>
          <Row label="Plan">
            {planTitle ?? (
              <span className="text-muted-foreground">Plan {shortId(coaching.plan_id)} (retired or hidden)</span>
            )}
          </Row>
          <Row label="Fee a month">{formatInr(coaching.fee_inr)}</Row>
          <Row label="Dates">{formatDateRange(coaching.starts_on, coaching.ends_on)}</Row>
          <Row label="Chat">
            <ChatRow conversationId={coaching.conversation_id} clientName={clientName} permissions={permissions} />
          </Row>
          <Row label="Requested">{formatDateTime(coaching.created_at)}</Row>
          {coaching.status === "cancelled" ? (
            <Row label="Ended">
              {coaching.cancelled_by ? `By ${COACHING_CANCELLED_BY_LABELS[coaching.cancelled_by]}` : "Ended"}
              {coaching.cancellation_reason ? `: ${coaching.cancellation_reason}` : ""}
            </Row>
          ) : null}
        </dl>
        {names.clientNote ? <p className="text-xs text-muted-foreground">{names.clientNote}</p> : null}
      </Card>

      <Card id="coaching-periods" title="Months">
        {periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No months yet.</p>
        ) : (
          <ul className="flex flex-col divide-y text-sm">
            {periods.map((period) => {
              const paymentHref = period.payment_id ? permittedHref(permissions, `/payments/${period.payment_id}`) : null;
              return (
                <li key={period.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="flex flex-col">
                    <span className="font-medium">Month {period.seq}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateRange(period.starts_on, period.ends_on)}, {formatInr(period.price_inr)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <PeriodStatusBadge status={period.status} />
                    {paymentHref ? (
                      <Link href={paymentHref} className={linkClass}>
                        Payment
                      </Link>
                    ) : period.payment_id ? null : (
                      <span className="text-xs text-muted-foreground">No payment yet</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {!paymentsReadable && periods.some((period) => period.payment_id) ? (
          <p className="text-xs text-muted-foreground">
            {missingPermissionMessage("payments.read", "Opening a month's payment")}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

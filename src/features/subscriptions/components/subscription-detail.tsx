import Link from "next/link";
import type { ReactNode } from "react";
import { formatDateTime, formatInr } from "@/features/applications/format";
import { MODE_LABELS } from "@/features/applications/schemas";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { formatSessionRange } from "@/features/bookings/format";
import { shortId } from "@/features/payments/format";
import { permittedHref } from "@/features/support/format";
import { missingPermissionMessage } from "@/features/users/format";
import type { PartyNames } from "@/features/subscriptions/api";
import { PeriodStatusBadge } from "@/features/subscriptions/components/period-status-badge";
import { formatDateRange, formatSlots } from "@/features/subscriptions/format";
import { SUBSCRIPTION_PERIOD_LABELS } from "@/features/subscriptions/schemas";
import type { SubscriptionSession } from "@/lib/db/subscriptions";
import type { SubscriptionPeriodRow, SubscriptionRow, SubscriptionSlotRow } from "@/types/database";

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

const CANCELLED_BY_LABELS = { client: "the client", trainer: "the trainer", admin: "BRUTAL" } as const;

/**
 * One subscription: the plan and its prices, the weekly slots, every period with its payment
 * state and a link to the payment (payments.read), and every session (bookings.read, the
 * route's key). Credits are sessions owed after a paid session was cancelled.
 */
export function SubscriptionDetail({
  subscription,
  slots,
  periods,
  sessions,
  names,
  permissions,
}: {
  subscription: SubscriptionRow;
  slots: readonly SubscriptionSlotRow[];
  periods: readonly SubscriptionPeriodRow[];
  sessions: readonly SubscriptionSession[];
  names: PartyNames;
  permissions: readonly string[];
}) {
  const clientName = names.clients[subscription.client_id] ?? `Client ${shortId(subscription.client_id)}`;
  const trainerName = names.trainers[subscription.trainer_id] ?? `Trainer ${shortId(subscription.trainer_id)}`;
  const paymentsReadable = permittedHref(permissions, "/payments") !== null;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="subscription-summary" title="Subscription">
          <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
            <Row label="Client">
              <MaybeLink href={permittedHref(permissions, `/users/${subscription.client_id}`)}>{clientName}</MaybeLink>
            </Row>
            <Row label="Trainer">
              <MaybeLink
                href={
                  permittedHref(permissions, `/trainers/${subscription.trainer_id}`) ??
                  permittedHref(permissions, `/users/${subscription.trainer_id}`)
                }
              >
                {trainerName}
              </MaybeLink>
            </Row>
            <Row label="Length">
              {SUBSCRIPTION_PERIOD_LABELS[subscription.period]}, {subscription.sessions_per_week} sessions a week,{" "}
              {MODE_LABELS[subscription.mode].toLowerCase()}
            </Row>
            <Row label="Dates">{formatDateRange(subscription.starts_on, subscription.ends_on)}</Row>
            <Row label="Weekly slots">{formatSlots(slots)}</Row>
            <Row label="Session price">{formatInr(subscription.session_price_inr)}</Row>
            <Row label="Discount">{subscription.discount_pct}%</Row>
            <Row label="Per period">{formatInr(subscription.period_price_inr)}</Row>
            <Row label="Credits">
              {subscription.credits}
              <span className="block text-xs text-muted-foreground">
                Sessions owed after a paid session was cancelled; the client books them on a free slot.
              </span>
            </Row>
            <Row label="Requested">{formatDateTime(subscription.created_at)}</Row>
            {subscription.status === "cancelled" ? (
              <Row label="Cancelled">
                {subscription.cancelled_by ? `By ${CANCELLED_BY_LABELS[subscription.cancelled_by]}` : "Cancelled"}
                {subscription.cancellation_reason ? `: ${subscription.cancellation_reason}` : ""}
              </Row>
            ) : null}
          </dl>
          {names.clientNote ? <p className="text-xs text-muted-foreground">{names.clientNote}</p> : null}
        </Card>

        <Card id="subscription-periods" title="Periods">
          {periods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No periods yet.</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm">
              {periods.map((period) => {
                const paymentHref = period.payment_id ? permittedHref(permissions, `/payments/${period.payment_id}`) : null;
                return (
                  <li key={period.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="flex flex-col">
                      <span className="font-medium">Period {period.seq}</span>
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
              {missingPermissionMessage("payments.read", "Opening a period's payment")}
            </p>
          ) : null}
        </Card>
      </div>

      <Card id="subscription-sessions" title="Sessions">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions booked.</p>
        ) : (
          <ul className="flex flex-col divide-y text-sm">
            {sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <MaybeLink href={permittedHref(permissions, `/bookings/${session.id}`)}>
                  {formatSessionRange(session.startAt, session.endAt)}
                </MaybeLink>
                <BookingStatusBadge status={session.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

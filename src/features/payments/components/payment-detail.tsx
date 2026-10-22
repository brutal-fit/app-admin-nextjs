import Link from "next/link";
import type { ReactNode } from "react";
import { formatDateTime, formatInr } from "@/features/applications/format";
import { MODE_LABELS } from "@/features/applications/schemas";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { formatSessionRange } from "@/features/bookings/format";
import { CopyIdButton } from "@/features/payments/components/copy-id-button";
import { PaymentStateBadge } from "@/features/payments/components/payment-state-badge";
import { formatRawEvent } from "@/features/payments/format";
import type { PaymentBookingsState } from "@/features/payments/api";
import { permittedHref } from "@/features/support/format";
import type { PaymentBooking } from "@/lib/db/payments";
import type { PaymentRow } from "@/types/database";

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

const linkClass = "focus-ring rounded-sm font-medium underline-offset-4 hover:underline";

function MaybeLink({ href, children }: { href: string | null; children: ReactNode }) {
  return href ? (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  ) : (
    <span className="font-medium">{children}</span>
  );
}

const none = <span className="text-muted-foreground">None</span>;

/** The booking the payment is for: session, parties and a link, when bookings.read allows. */
function BookingSummary({
  bookingId,
  booking,
  state,
  permissions,
}: {
  bookingId: string;
  booking: PaymentBooking | null;
  state: PaymentBookingsState;
  permissions: readonly string[];
}) {
  const bookingHref = permittedHref(permissions, `/bookings/${bookingId}`);
  if (state.kind !== "ok" || !booking) {
    return (
      <Card id="payment-booking" title="Booking">
        <p className="text-sm text-muted-foreground">
          {state.kind === "ok" ? "The booking could not be found." : state.reason}
        </p>
        <p className="font-mono text-xs text-muted-foreground">{bookingId}</p>
      </Card>
    );
  }
  return (
    <Card id="payment-booking" title="Booking">
      <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
        <Row label="Session">
          <MaybeLink href={bookingHref}>{formatSessionRange(booking.startAt, booking.endAt)}</MaybeLink>
        </Row>
        <Row label="Service">
          {booking.serviceTitle}, {MODE_LABELS[booking.mode].toLowerCase()}
        </Row>
        <Row label="Status">
          <BookingStatusBadge status={booking.status} />
        </Row>
        <Row label="Client">
          <MaybeLink href={permittedHref(permissions, `/users/${booking.clientId}`)}>
            {booking.clientName || "Unnamed"}
          </MaybeLink>
        </Row>
        {booking.gymId ? (
          <Row label="Gym">
            <MaybeLink href={permittedHref(permissions, `/gyms/${booking.gymId}`)}>{booking.gymName || "Gym"}</MaybeLink>
          </Row>
        ) : null}
        {booking.trainerId ? (
          <Row label="Trainer">
            <MaybeLink
              href={
                permittedHref(permissions, `/trainers/${booking.trainerId}`) ??
                permittedHref(permissions, `/users/${booking.trainerId}`)
              }
            >
              {booking.trainerName || "Unnamed"}
            </MaybeLink>
          </Row>
        ) : booking.gymId ? (
          <Row label="Trainer">
            <span className="text-muted-foreground">Awaiting gym allotment</span>
          </Row>
        ) : null}
      </dl>
    </Card>
  );
}

/**
 * Every column of the payment, the booking it pays for, and the stored Razorpay event behind
 * a disclosure. Gated by payments.read; the booking summary needs bookings.read.
 */
export function PaymentDetail({
  payment,
  booking,
  bookingState,
  permissions,
}: {
  payment: PaymentRow;
  booking: PaymentBooking | null;
  bookingState: PaymentBookingsState;
  permissions: readonly string[];
}) {
  const raw = formatRawEvent(payment.raw);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="payment-fields" title="Payment">
          <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
            <Row label="State">
              <PaymentStateBadge state={payment.state} />
            </Row>
            <Row label="Amount">
              {formatInr(payment.amount_inr)} <span className="text-muted-foreground">({payment.currency})</span>
            </Row>
            <Row label="Provider">{payment.provider === "razorpay" ? "Razorpay" : payment.provider}</Row>
            <Row label="Order id">
              <CopyIdButton value={payment.order_id} label="Order id" />
            </Row>
            <Row label="Payment id">
              {payment.payment_id ? <CopyIdButton value={payment.payment_id} label="Payment id" /> : none}
            </Row>
            <Row label="Signature">
              {payment.signature_verified ? "Checked by the app's confirm step" : "Not checked (webhook only or not paid)"}
            </Row>
            <Row label="Last event">
              {payment.last_event_id ? <span className="font-mono text-xs">{payment.last_event_id}</span> : none}
            </Row>
            <Row label="Created">{formatDateTime(payment.created_at)}</Row>
            <Row label="Last change">{formatDateTime(payment.updated_at)}</Row>
            <Row label="Payment ref">
              <span className="font-mono text-xs">{payment.id}</span>
            </Row>
          </dl>
        </Card>
        <div className="flex flex-col gap-6">
          <Card id="payment-refund" title="Refund">
            <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
              <Row label="Refund id">
                {payment.refund_id ? <CopyIdButton value={payment.refund_id} label="Refund id" /> : none}
              </Row>
              <Row label="Refund amount">
                {payment.refund_amount_inr !== null ? formatInr(payment.refund_amount_inr) : none}
              </Row>
              <Row label="Reason">{payment.refund_reason || none}</Row>
              <Row label="Failed calls">
                {payment.refund_attempts}
                <span className="block text-xs text-muted-foreground">
                  Razorpay refusals of a queued refund; the fifth marks the refund failed.
                </span>
              </Row>
            </dl>
          </Card>
          <BookingSummary
            bookingId={payment.booking_id}
            booking={booking}
            state={bookingState}
            permissions={permissions}
          />
        </div>
      </div>
      <Card id="payment-raw" title="Raw event">
        {raw ? (
          <details>
            <summary className="focus-ring w-fit cursor-pointer rounded-sm text-sm text-muted-foreground hover:text-foreground">
              Show the stored Razorpay event
            </summary>
            <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">{raw}</pre>
          </details>
        ) : (
          <p className="text-sm text-muted-foreground">No Razorpay event is stored for this payment.</p>
        )}
      </Card>
    </div>
  );
}

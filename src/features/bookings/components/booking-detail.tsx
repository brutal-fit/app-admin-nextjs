import Link from "next/link";
import type { ReactNode } from "react";
import { formatDateTime, formatInr } from "@/features/applications/format";
import { MODE_LABELS } from "@/features/applications/schemas";
import { PaymentStatusBadge } from "@/features/bookings/components/payment-status-badge";
import { CANCELLED_BY_LABELS } from "@/features/bookings/schemas";
import { permittedHref } from "@/features/support/format";
import type { BookingListRow } from "@/lib/db/bookings";
import type { BookingRow } from "@/types/database";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function Party({ href, name }: { href: string | null; name: string }) {
  return href ? (
    <Link href={href} className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline">
      {name}
    </Link>
  ) : (
    <span className="font-medium">{name}</span>
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

/**
 * The parties with links (each only when the session may open the page), the service, the
 * price snapshot taken at request time, payment status and how the booking was cancelled.
 * Gated by bookings.read.
 */
export function BookingDetail({
  booking,
  summary,
  permissions,
}: {
  booking: BookingRow;
  summary: BookingListRow | null;
  permissions: readonly string[];
}) {
  const clientName = summary?.client_name || "Unnamed";
  const trainerName = summary?.trainer_name || "Unnamed";
  const trainerHref =
    permittedHref(permissions, `/trainers/${booking.trainer_id}`) ??
    permittedHref(permissions, `/users/${booking.trainer_id}`);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card id="booking-parties" title="Parties">
        <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
          <Row label="Client">
            <Party href={permittedHref(permissions, `/users/${booking.client_id}`)} name={clientName} />
          </Row>
          <Row label="Trainer">
            <Party href={trainerHref} name={trainerName} />
          </Row>
        </dl>
      </Card>
      <Card id="booking-money" title="Service and payment">
        <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
          <Row label="Service">{booking.service_title}</Row>
          <Row label="Mode">{MODE_LABELS[booking.mode]}</Row>
          <Row label="Length">{booking.duration_minutes} min</Row>
          <Row label="Price">
            {formatInr(booking.price_snapshot_inr)}
            <span className="block text-xs text-muted-foreground">
              Snapshot taken when the client asked; later price changes do not touch it.
            </span>
          </Row>
          <Row label="Payment">
            <PaymentStatusBadge status={booking.payment_status} />
          </Row>
          <Row label="Policy">{booking.cancellation_policy}</Row>
          {booking.status === "cancelled" ? (
            <>
              <Row label="Cancelled">
                {booking.cancelled_by ? CANCELLED_BY_LABELS[booking.cancelled_by] : "Cancelled"}
              </Row>
              <Row label="Reason">{booking.cancellation_reason || "None given"}</Row>
            </>
          ) : null}
          {booking.trainer_note ? <Row label="Trainer note">{booking.trainer_note}</Row> : null}
          <Row label="Created">{formatDateTime(booking.created_at)}</Row>
        </dl>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { Repeat } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
import { BookingAddressCard } from "@/features/bookings/components/booking-address-card";
import { BookingDetail } from "@/features/bookings/components/booking-detail";
import { BookingDisputeCard } from "@/features/bookings/components/booking-dispute-card";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { BookingTimeline } from "@/features/bookings/components/booking-timeline";
import { CancelBookingDialog } from "@/features/bookings/components/cancel-booking-dialog";
import { ResolveDisputeDialog } from "@/features/bookings/components/resolve-dispute-dialog";
import { loadBookingDetail } from "@/features/bookings/api";
import { BookingPaymentCard } from "@/features/payments/components/booking-payment-card";
import { loadBookingPayment } from "@/features/payments/api";
import { bookingStatusTone, formatSessionRange } from "@/features/bookings/format";
import { canResolveDispute, isCancellable } from "@/features/bookings/schemas";
import { BOOKING_STATUS_LABELS, missingPermissionMessage } from "@/features/users/format";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BACK = { href: "/bookings", label: "Back to bookings" };

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireRoutePermission("/bookings/[id]");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const result = await loadBookingDetail(supabase, id);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Booking" back={BACK} />
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { detail, address, gym } = result;
  const payment = await loadBookingPayment(supabase, access, detail.booking.id);
  const { booking, dispute } = detail;
  const cancellable = isCancellable(booking.status);
  const resolvable = canResolveDispute(booking.status, booking.dispute_resolved_at);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Booking"
        title={booking.service_title}
        back={BACK}
        status={
          // Pulses once when an action comes back from the server with a new status.
          <StatusPulse value={booking.status} className={bookingStatusTone(booking.status)}>
            <BookingStatusBadge status={booking.status} />
          </StatusPulse>
        }
        description={<p>{formatSessionRange(booking.start_at, booking.end_at)}, India time.</p>}
        actions={
          detail.subscriptionId ? (
            <Link
              href={`/subscriptions/${detail.subscriptionId}`}
              className="focus-ring inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              <Repeat size={14} aria-hidden="true" />
              Part of subscription
            </Link>
          ) : null
        }
      />

      <BookingDetail detail={detail} gym={gym} permissions={access.permissions} />

      <div className="grid gap-6 lg:grid-cols-2">
        <BookingTimeline
          booking={booking}
          timeline={detail.timeline}
          dispute={dispute}
          permissions={access.permissions}
        />
        <div className="flex flex-col gap-6">
          <BookingPaymentCard state={payment} permissions={access.permissions} />
          <BookingDisputeCard dispute={dispute} permissions={access.permissions} />
          <BookingAddressCard address={address} mode={booking.mode} hasAddress={detail.hasAddress} />
        </div>
      </div>

      <section aria-labelledby="booking-actions" className="flex flex-col gap-3">
        <h2 id="booking-actions" className="text-lg font-semibold">
          Actions
        </h2>
        {!can(access.permissions, "bookings.cancel") ? (
          <p className="text-sm text-muted-foreground">
            {missingPermissionMessage("bookings.cancel", "Cancelling and resolving disputes")}
          </p>
        ) : cancellable || resolvable ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {cancellable ? (
                <CancelBookingDialog bookingId={booking.id} paid={booking.payment_status === "paid"} />
              ) : null}
              {resolvable ? <ResolveDisputeDialog bookingId={booking.id} /> : null}
            </div>
            {resolvable && dispute?.state !== "open" ? (
              <p className="text-xs text-muted-foreground">
                No open dispute is on record for this booking. Resolve one only when the client and
                trainer disagree about what happened.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {booking.dispute_resolved_at
              ? "The dispute on this booking is resolved; nothing else can change here."
              : `A booking that is ${BOOKING_STATUS_LABELS[booking.status].toLowerCase()} cannot be cancelled or disputed.`}
          </p>
        )}
      </section>
    </div>
  );
}

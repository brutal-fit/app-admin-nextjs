import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInr } from "@/features/applications/format";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { formatSessionRange } from "@/features/bookings/format";
import { permittedHref } from "@/features/support/format";
import type { AdminGymBooking } from "@/lib/db/gyms";

const MODE = { home: "At the gym", online: "Online" } as const;

/**
 * The gym's latest 50 bookings from admin_get_gym, newest session first. The booking link
 * needs bookings.read; a booking without a trainer is waiting for the gym to allot one.
 */
export function GymBookingList({
  bookings,
  total,
  permissions,
}: {
  bookings: readonly AdminGymBooking[];
  total: number;
  permissions: readonly string[];
}) {
  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">No bookings yet.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border bg-card shadow-tile">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Trainer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => {
              const href = permittedHref(permissions, `/bookings/${booking.id}`);
              const when = formatSessionRange(booking.start_at, booking.end_at);
              return (
                <TableRow key={booking.id}>
                  <TableCell>
                    {href ? (
                      <Link href={href} className="focus-ring rounded-sm underline-offset-4 hover:underline">
                        {when}
                      </Link>
                    ) : (
                      when
                    )}
                  </TableCell>
                  <TableCell>
                    {booking.service_title}
                    <span className="block text-xs text-muted-foreground">{MODE[booking.mode]}</span>
                  </TableCell>
                  <TableCell>{booking.client_name ?? "BRUTAL member"}</TableCell>
                  <TableCell>
                    {booking.trainer_name ?? <span className="text-muted-foreground">Not allotted</span>}
                  </TableCell>
                  <TableCell>
                    <BookingStatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatInr(booking.price_snapshot_inr)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {total > bookings.length ? (
        <p className="text-xs text-muted-foreground">
          Showing the latest {bookings.length} of {total} bookings.
        </p>
      ) : null}
    </div>
  );
}

import { Calendar } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInr } from "@/features/applications/format";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { formatSessionRange } from "@/features/bookings/format";
import { firstName } from "@/features/gyms/format";
import { GYM_BOOKINGS_MAX } from "@/lib/db/gyms";
import type { BookingDetailsRow } from "@/types/database";

const MODE = { home: "At the gym", online: "Online" } as const;

/** The gym's bookings as the manager sees them: client by first name, trainer, slot, status. */
export function MyGymBookingList({
  bookings,
  caption,
  emptyText,
}: {
  bookings: readonly BookingDetailsRow[];
  caption: string;
  emptyText: string;
}) {
  if (bookings.length === 0) {
    return <EmptyState icon={Calendar} title={`No ${caption.toLowerCase()}`} description={emptyText} />;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border bg-card shadow-tile">
        <Table>
          <caption className="sr-only">{caption}</caption>
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
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{formatSessionRange(booking.start_at, booking.end_at)}</TableCell>
                <TableCell>
                  {booking.service_title}
                  <span className="block text-xs text-muted-foreground">{MODE[booking.mode]}</span>
                </TableCell>
                <TableCell>{firstName(booking.client_name)}</TableCell>
                <TableCell>
                  {booking.trainer_id ? (
                    (booking.trainer_name ?? "BRUTAL member")
                  ) : (
                    <span className="text-muted-foreground">Not allotted</span>
                  )}
                </TableCell>
                <TableCell>
                  <BookingStatusBadge status={booking.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatInr(booking.price_snapshot_inr)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {bookings.length >= GYM_BOOKINGS_MAX ? (
        <p className="text-xs text-muted-foreground">Showing the first {GYM_BOOKINGS_MAX}; older or later ones are not listed.</p>
      ) : null}
    </div>
  );
}

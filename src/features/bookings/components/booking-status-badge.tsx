import { Badge } from "@/components/ui/badge";
import { bookingStatusTone } from "@/features/bookings/format";
import { BOOKING_STATUS_LABELS } from "@/features/users/format";
import type { BookingStatus } from "@/types/database";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant="outline" className={bookingStatusTone(status)}>
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}

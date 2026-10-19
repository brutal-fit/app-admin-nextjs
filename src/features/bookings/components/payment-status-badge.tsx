import { Badge } from "@/components/ui/badge";
import { paymentStatusTone } from "@/features/bookings/format";
import { PAYMENT_STATUS_LABELS } from "@/features/bookings/schemas";
import type { PaymentStatus } from "@/types/database";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={paymentStatusTone(status)}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

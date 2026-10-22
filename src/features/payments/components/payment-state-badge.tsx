import { Badge } from "@/components/ui/badge";
import { paymentStateTone } from "@/features/payments/format";
import { PAYMENT_STATE_LABELS } from "@/features/payments/schemas";
import type { PaymentState } from "@/types/database";

export function PaymentStateBadge({ state }: { state: PaymentState }) {
  return (
    <Badge variant="outline" className={paymentStateTone(state)}>
      {PAYMENT_STATE_LABELS[state]}
    </Badge>
  );
}

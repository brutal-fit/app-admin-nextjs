import { Badge } from "@/components/ui/badge";
import { periodStatusTone } from "@/features/subscriptions/format";
import { PERIOD_STATUS_LABELS } from "@/features/subscriptions/schemas";
import type { PeriodStatus } from "@/types/database";

/** A subscription period's or coaching month's payment state. */
export function PeriodStatusBadge({ status }: { status: PeriodStatus }) {
  return (
    <Badge variant="outline" className={periodStatusTone(status)}>
      {PERIOD_STATUS_LABELS[status]}
    </Badge>
  );
}

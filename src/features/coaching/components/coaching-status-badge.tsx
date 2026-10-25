import { Badge } from "@/components/ui/badge";
import { COACHING_STATUS_LABELS } from "@/features/coaching/schemas";
import { subscriptionStatusTone } from "@/features/subscriptions/format";
import type { CoachingStatus } from "@/types/database";

export function CoachingStatusBadge({ status }: { status: CoachingStatus }) {
  return (
    <Badge variant="outline" className={subscriptionStatusTone(status)}>
      {COACHING_STATUS_LABELS[status]}
    </Badge>
  );
}

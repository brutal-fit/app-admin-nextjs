import { Badge } from "@/components/ui/badge";
import { subscriptionStatusTone } from "@/features/subscriptions/format";
import { SUBSCRIPTION_STATUS_LABELS } from "@/features/subscriptions/schemas";
import type { SubscriptionStatus } from "@/types/database";

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <Badge variant="outline" className={subscriptionStatusTone(status)}>
      {SUBSCRIPTION_STATUS_LABELS[status]}
    </Badge>
  );
}

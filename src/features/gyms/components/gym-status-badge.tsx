import { Badge } from "@/components/ui/badge";
import { GYM_STATUS_LABELS, gymStatusTone } from "@/features/gyms/format";
import type { GymStatus } from "@/types/database";

export function GymStatusBadge({ status }: { status: GymStatus }) {
  return (
    <Badge variant="outline" className={gymStatusTone(status)}>
      {GYM_STATUS_LABELS[status]}
    </Badge>
  );
}

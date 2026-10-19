import { Badge } from "@/components/ui/badge";
import { supportStatusTone } from "@/features/support/format";
import { SUPPORT_STATUS_LABELS } from "@/features/support/schemas";
import type { SupportCaseStatus } from "@/types/database";

/** The case status as an outline pill. */
export function SupportStatusBadge({ status }: { status: SupportCaseStatus }) {
  return (
    <Badge variant="outline" className={supportStatusTone(status)}>
      {SUPPORT_STATUS_LABELS[status]}
    </Badge>
  );
}

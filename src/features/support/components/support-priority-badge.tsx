import { AlertCircle } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { supportPriorityTone } from "@/features/support/format";
import { SUPPORT_PRIORITY_LABELS } from "@/features/support/schemas";
import type { SupportPriority } from "@/types/database";

/** The case priority; a safety case carries an icon so it does not rely on colour alone. */
export function SupportPriorityBadge({ priority }: { priority: SupportPriority }) {
  return (
    <Badge variant="outline" className={supportPriorityTone(priority)} data-priority={priority}>
      {priority === "safety" ? <AlertCircle size={12} aria-hidden="true" /> : null}
      {SUPPORT_PRIORITY_LABELS[priority]}
    </Badge>
  );
}

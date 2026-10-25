import Link from "next/link";
import { X } from "@/components/icons";
import { FilterChips } from "@/components/data-table/filter-chips";
import {
  COACHING_STATUSES,
  COACHING_STATUS_LABELS,
  coachingListHref,
  hasCoachingFilters,
  type CoachingFilters as Filters,
} from "@/features/coaching/schemas";

const removeClass =
  "focus-ring inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-foreground";

/** Status chips plus the coach the list is narrowed to (from the trainer page). Gated by bookings.read. */
export function CoachingFilters({ filters, coachName }: { filters: Filters; coachName: string | null }) {
  return (
    <div className="flex flex-col gap-3">
      <FilterChips
        label="Filter by status"
        chips={[
          { id: "all", label: "All statuses", active: filters.status === null, href: coachingListHref(filters, { status: null }) },
          ...COACHING_STATUSES.map((status) => ({
            id: status,
            label: COACHING_STATUS_LABELS[status],
            active: filters.status === status,
            href: coachingListHref(filters, { status: filters.status === status ? null : status }),
          })),
        ]}
      />
      {hasCoachingFilters(filters) ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.coachId ? (
            <Link href={coachingListHref(filters, { coachId: null })} className={removeClass}>
              Coach: {coachName ?? "selected coach"}
              <X size={14} aria-label="Remove" />
            </Link>
          ) : null}
          <Link href="/coaching" className={removeClass}>
            Clear all
          </Link>
        </div>
      ) : null}
    </div>
  );
}

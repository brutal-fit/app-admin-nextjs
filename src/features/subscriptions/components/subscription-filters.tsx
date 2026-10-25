import Link from "next/link";
import { X } from "@/components/icons";
import { FilterChips } from "@/components/data-table/filter-chips";
import {
  SUBSCRIPTION_PERIODS,
  SUBSCRIPTION_PERIOD_LABELS,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABELS,
  hasSubscriptionFilters,
  subscriptionListHref,
  type SubscriptionFilters as Filters,
} from "@/features/subscriptions/schemas";

const removeClass =
  "focus-ring inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-foreground";

/**
 * Status and period chips plus the trainer the list is narrowed to (from the trainer page).
 * Every filter lives in the URL. Gated by bookings.read.
 */
export function SubscriptionFilters({ filters, trainerName }: { filters: Filters; trainerName: string | null }) {
  return (
    <div className="flex flex-col gap-3">
      <FilterChips
        label="Filter by status"
        chips={[
          {
            id: "all",
            label: "All statuses",
            active: filters.status === null,
            href: subscriptionListHref(filters, { status: null }),
          },
          ...SUBSCRIPTION_STATUSES.map((status) => ({
            id: status,
            label: SUBSCRIPTION_STATUS_LABELS[status],
            active: filters.status === status,
            href: subscriptionListHref(filters, { status: filters.status === status ? null : status }),
          })),
        ]}
      />
      <FilterChips
        label="Filter by length"
        chips={[
          {
            id: "all",
            label: "Any length",
            active: filters.period === null,
            href: subscriptionListHref(filters, { period: null }),
          },
          ...SUBSCRIPTION_PERIODS.map((period) => ({
            id: period,
            label: SUBSCRIPTION_PERIOD_LABELS[period],
            active: filters.period === period,
            href: subscriptionListHref(filters, { period: filters.period === period ? null : period }),
          })),
        ]}
      />
      {filters.trainerId || hasSubscriptionFilters(filters) ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.trainerId ? (
            <Link href={subscriptionListHref(filters, { trainerId: null })} className={removeClass}>
              Trainer: {trainerName ?? "selected trainer"}
              <X size={14} aria-label="Remove" />
            </Link>
          ) : null}
          <Link href="/subscriptions" className={removeClass}>
            Clear all
          </Link>
        </div>
      ) : null}
    </div>
  );
}

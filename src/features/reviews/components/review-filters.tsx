import Link from "next/link";
import { X } from "@/components/icons";
import { FilterChips } from "@/components/data-table/filter-chips";
import {
  hasReviewFilters,
  reviewListHref,
  type ReviewFilters as Filters,
} from "@/features/reviews/schemas";

/**
 * Reported and visibility chips plus the trainer filter (set from a trainer or user page),
 * all in the URL. Gated by reviews.moderate.
 */
export function ReviewFilters({
  filters,
  trainerName,
}: {
  filters: Filters;
  trainerName: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <FilterChips
        label="Filter by reports"
        chips={[
          {
            id: "all",
            label: "Reported first",
            active: filters.reported === null,
            href: reviewListHref(filters, { reported: null }),
          },
          {
            id: "yes",
            label: "Reported only",
            active: filters.reported === "yes",
            href: reviewListHref(filters, { reported: filters.reported === "yes" ? null : "yes" }),
          },
          {
            id: "no",
            label: "Not reported",
            active: filters.reported === "no",
            href: reviewListHref(filters, { reported: filters.reported === "no" ? null : "no" }),
          },
        ]}
      />
      <div className="flex flex-wrap items-center gap-3">
        <FilterChips
          label="Filter by visibility"
          chips={[
            {
              id: "all",
              label: "Shown and hidden",
              active: filters.hidden === null,
              href: reviewListHref(filters, { hidden: null }),
            },
            {
              id: "no",
              label: "Shown",
              active: filters.hidden === "no",
              href: reviewListHref(filters, { hidden: filters.hidden === "no" ? null : "no" }),
            },
            {
              id: "yes",
              label: "Hidden",
              active: filters.hidden === "yes",
              href: reviewListHref(filters, { hidden: filters.hidden === "yes" ? null : "yes" }),
            },
          ]}
        />
        {filters.trainerId ? (
          <Link
            href={reviewListHref(filters, { trainerId: null })}
            className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-primary px-3 py-1 text-sm text-foreground hover:bg-accent"
          >
            Trainer: {trainerName ?? "selected trainer"}
            <span className="sr-only">, remove this filter</span>
            <X size={14} aria-hidden="true" />
          </Link>
        ) : null}
        {hasReviewFilters(filters) ? (
          <Link
            href="/reviews"
            className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X size={14} aria-hidden="true" />
            Clear all
          </Link>
        ) : null}
      </div>
    </div>
  );
}

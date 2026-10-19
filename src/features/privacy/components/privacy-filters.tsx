import { FilterChips } from "@/components/data-table/filter-chips";
import {
  PRIVACY_KINDS,
  PRIVACY_STATUS_FILTERS,
  PRIVACY_STATUS_FILTER_LABELS,
  privacyListHref,
  type PrivacyFilters as Filters,
} from "@/features/privacy/schemas";
import { PRIVACY_KIND_LABELS } from "@/features/users/format";

/** Status and kind chips, both in the URL. Gated by privacy.process. */
export function PrivacyFilters({ filters }: { filters: Filters }) {
  return (
    <div className="flex flex-col gap-3">
      <FilterChips
        label="Filter by status"
        chips={[
          {
            id: "all",
            label: "All, pending first",
            active: filters.status === null,
            href: privacyListHref(filters, { status: null }),
          },
          ...PRIVACY_STATUS_FILTERS.map((status) => ({
            id: status,
            label: PRIVACY_STATUS_FILTER_LABELS[status],
            active: filters.status === status,
            href: privacyListHref(filters, { status: filters.status === status ? null : status }),
          })),
        ]}
      />
      <FilterChips
        label="Filter by kind"
        chips={PRIVACY_KINDS.map((kind) => ({
          id: kind,
          label: PRIVACY_KIND_LABELS[kind],
          active: filters.kind === kind,
          href: privacyListHref(filters, { kind: filters.kind === kind ? null : kind }),
        }))}
        clear={{ href: privacyListHref(filters, { kind: null }) }}
      />
    </div>
  );
}

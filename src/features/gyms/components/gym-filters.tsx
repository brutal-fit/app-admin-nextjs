import { FilterChips } from "@/components/data-table/filter-chips";
import { Search } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GYM_STATUS_LABELS } from "@/features/gyms/format";
import {
  EMPTY_GYM_FILTERS,
  GYM_SEARCH_MAX,
  GYM_STATUS_FILTERS,
  gymListHref,
  type GymListFilters,
} from "@/features/gyms/schemas";

/** Status chips and a name, area or city search; both live in the URL. */
export function GymFilters({ filters }: { filters: GymListFilters }) {
  const active = filters.status !== "all" || filters.q !== "";
  return (
    <div className="flex flex-col gap-3">
      <FilterChips
        label="Filter by status"
        chips={GYM_STATUS_FILTERS.map((status) => ({
          id: status,
          label: status === "all" ? "All" : GYM_STATUS_LABELS[status],
          active: filters.status === status,
          href: gymListHref(filters, { status }),
        }))}
        clear={active ? { href: gymListHref(EMPTY_GYM_FILTERS) } : undefined}
      />
      <form action="/gyms" method="get" role="search" className="flex max-w-md items-center gap-2">
        {filters.status !== "all" ? <input type="hidden" name="status" value={filters.status} /> : null}
        <label htmlFor="gym-search" className="sr-only">
          Search gyms
        </label>
        <Input
          id="gym-search"
          name="q"
          defaultValue={filters.q}
          placeholder="Name, area or city"
          maxLength={GYM_SEARCH_MAX}
        />
        <Button type="submit" variant="outline">
          <Search size={16} aria-hidden="true" />
          Search
        </Button>
      </form>
    </div>
  );
}

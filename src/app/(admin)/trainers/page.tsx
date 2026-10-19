import { FilterChips } from "@/components/data-table/filter-chips";
import { PageHeader } from "@/components/layout/page-header";
import { TrainerTable } from "@/features/trainers/components/trainer-table";
import { loadTrainerList } from "@/features/trainers/api";
import {
  LISTED_FILTERS,
  LISTED_FILTER_LABELS,
  TRAINER_LIST_LIMIT,
  parseListedFilter,
  trainerListHref,
} from "@/features/trainers/schemas";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TrainersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/trainers");
  const filter = parseListedFilter((await searchParams).listed);
  const supabase = await createSupabaseServerClient();
  const result = await loadTrainerList(supabase, access, filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Trainers"
        title="Trainers"
        description="Every approved trainer: whether clients can find them, their rating, bookings, city and listing prices. Open one to correct the profile, services and prices, or ask for new documents."
      />
      <FilterChips
        label="Filter by listing"
        chips={LISTED_FILTERS.map((value) => ({
          id: value,
          label: LISTED_FILTER_LABELS[value],
          active: filter === value,
          href: trainerListHref(value),
        }))}
      />
      {result.ok ? (
        <>
          <TrainerTable rows={result.rows} filtered={filter !== "all"} />
          {result.capped || result.bookingsNote ? (
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              {result.capped ? (
                <p>
                  The list reads the first {TRAINER_LIST_LIMIT} approved trainers; some may be
                  missing.
                </p>
              ) : null}
              {result.bookingsNote ? <p>{result.bookingsNote}</p> : null}
            </div>
          ) : null}
        </>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}

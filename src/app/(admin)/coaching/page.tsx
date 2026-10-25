import { PageLinks } from "@/components/data-table/page-links";
import { PageHeader } from "@/components/layout/page-header";
import { CoachingFilters } from "@/features/coaching/components/coaching-filters";
import { CoachingTable } from "@/features/coaching/components/coaching-table";
import { loadCoachingList } from "@/features/coaching/api";
import {
  COACHING_PAGE_SIZE,
  coachingListHref,
  hasCoachingFilters,
  parseCoachingFilters,
} from "@/features/coaching/schemas";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentTime, istDateString } from "@/lib/utils/time";

export default async function CoachingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/coaching");
  const filters = parseCoachingFilters(await searchParams);
  const supabase = await createSupabaseServerClient();
  const result = await loadCoachingList(supabase, access, filters, istDateString(currentTime()));
  const coachName = result.ok && filters.coachId ? (result.names.trainers[filters.coachId] ?? null) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Bookings"
        title="Coaching"
        description="Library programmes with a coach, paid monthly, newest first, with the month each is in now. Filters stay in the address."
      />
      <CoachingFilters filters={filters} coachName={coachName} />
      {result.ok ? (
        <>
          {result.names.clientNote ? (
            <p className="text-sm text-muted-foreground">{result.names.clientNote}</p>
          ) : null}
          <CoachingTable
            items={result.items}
            names={result.names}
            planTitles={result.planTitles}
            links={{ users: can(access.permissions, "users.read"), trainers: can(access.permissions, "trainers.read") }}
            filtered={hasCoachingFilters(filters) || filters.page > 1}
          />
          <PageLinks
            label="Coaching pages"
            noun="coachings"
            page={filters.page}
            pageSize={COACHING_PAGE_SIZE}
            shown={result.items.length}
            previousHref={filters.page > 1 ? coachingListHref(filters, { page: filters.page - 1 }) : null}
            nextHref={result.hasNext ? coachingListHref(filters, { page: filters.page + 1 }) : null}
          />
        </>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}

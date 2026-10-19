import { PageLinks } from "@/components/data-table/page-links";
import { PageHeader } from "@/components/layout/page-header";
import { PrivacyFilters } from "@/features/privacy/components/privacy-filters";
import { PrivacyQueueTable } from "@/features/privacy/components/privacy-queue-table";
import { loadPrivacyQueue } from "@/features/privacy/api";
import {
  PRIVACY_PAGE_SIZE,
  parsePrivacyFilters,
  privacyListHref,
} from "@/features/privacy/schemas";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentTime } from "@/lib/utils/time";

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/privacy");
  const filters = parsePrivacyFilters(await searchParams);
  const supabase = await createSupabaseServerClient();
  const result = await loadPrivacyQueue(supabase, filters, currentTime());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Users"
        title="Privacy requests"
        description="Data exports and account deletions users asked for in the app, waiting ones first and oldest first. Do the work outside the panel, then mark the request completed or rejected; the user is notified either way."
      />
      <PrivacyFilters filters={filters} />
      {result.ok ? (
        <section aria-labelledby="privacy-queue" className="flex flex-col gap-3">
          <h2 id="privacy-queue" className="sr-only">
            Requests
          </h2>
          <p className="text-sm text-muted-foreground">
            {result.total.toLocaleString("en-IN")} {result.total === 1 ? "request matches" : "requests match"}.
          </p>
          <PrivacyQueueTable rows={result.rows} filters={filters} permissions={access.permissions} />
          <PageLinks
            label="Privacy request pages"
            noun="requests"
            page={filters.page}
            pageSize={PRIVACY_PAGE_SIZE}
            shown={result.rows.length}
            previousHref={filters.page > 1 ? privacyListHref(filters, { page: filters.page - 1 }) : null}
            nextHref={result.hasNext ? privacyListHref(filters, { page: filters.page + 1 }) : null}
          />
        </section>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}

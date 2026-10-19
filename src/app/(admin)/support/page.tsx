import { PageHeader } from "@/components/layout/page-header";
import { SupportFilters } from "@/features/support/components/support-filters";
import { SupportPagination } from "@/features/support/components/support-pagination";
import { SupportQueueTable } from "@/features/support/components/support-queue-table";
import { loadSupportQueue } from "@/features/support/api";
import { hasSupportFilters, parseSupportFilters, supportListHref } from "@/features/support/schemas";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupportQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/support");
  const filters = parseSupportFilters(await searchParams);
  const supabase = await createSupabaseServerClient();
  const result = await loadSupportQueue(supabase, access, filters);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Support"
        title="Support queue"
        description="Every case and report from the app. Safety cases come first, then open cases, then the most recent change. Filters stay in the address, so a filtered queue can be shared."
      />
      {result.ok ? (
        <>
          {/* Keyed on the URL so the search box starts from the filters after navigation. */}
          <SupportFilters key={supportListHref(filters)} filters={filters} team={result.team} />
          <SupportQueueTable
            rows={result.rows}
            usersVisible={can(access.permissions, "users.read")}
            filtered={hasSupportFilters(filters) || filters.page > 1}
          />
          <SupportPagination filters={filters} shown={result.rows.length} hasNext={result.hasNext} />
        </>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}

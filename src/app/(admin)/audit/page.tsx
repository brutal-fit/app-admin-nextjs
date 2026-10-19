import { PageLinks } from "@/components/data-table/page-links";
import { PageHeader } from "@/components/layout/page-header";
import { loadAuditPage } from "@/features/audit/api";
import { AuditExportLink } from "@/features/audit/components/audit-export-link";
import { AuditFilters } from "@/features/audit/components/audit-filters";
import { AuditTable } from "@/features/audit/components/audit-table";
import { AUDIT_PAGE_SIZE, auditListHref, parseAuditFilters } from "@/features/audit/schemas";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { istDateString } from "@/lib/utils/time";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/audit");
  const filters = parseAuditFilters(await searchParams);
  const supabase = await createSupabaseServerClient();
  const result = await loadAuditPage(supabase, access, filters);
  const today = istDateString();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Audit"
        title="Audit log"
        description="Every change an admin made through the panel, newest first. Filters stay in the address, so a filtered log can be shared."
        actions={
          result.ok && result.total > 0 && can(access.permissions, "audit.export") ? (
            <AuditExportLink filters={filters} total={result.total} today={today} />
          ) : null
        }
      />
      {/* Keyed on the URL so the inputs start from the filters after navigation. */}
      <AuditFilters
        key={auditListHref(filters, { page: filters.page })}
        filters={filters}
        team={result.team}
        actorName={result.ok ? result.actorName : null}
        today={today}
      />
      {result.ok ? (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {result.total === 0
              ? filters.page > 1
                ? "This page is past the end of the log."
                : "No entries match."
              : `${result.total.toLocaleString("en-IN")} ${result.total === 1 ? "entry matches" : "entries match"}.`}
          </p>
          <AuditTable rows={result.rows} filters={filters} permissions={access.permissions} />
          <PageLinks
            label="Audit pages"
            noun="entries"
            page={filters.page}
            pageSize={AUDIT_PAGE_SIZE}
            shown={result.rows.length}
            previousHref={filters.page > 1 ? auditListHref(filters, { page: filters.page - 1 }) : null}
            nextHref={result.hasNext ? auditListHref(filters, { page: filters.page + 1 }) : null}
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

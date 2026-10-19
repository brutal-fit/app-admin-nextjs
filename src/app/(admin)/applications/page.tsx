import { PageHeader } from "@/components/layout/page-header";
import { ApplicationTable } from "@/features/applications/components/application-table";
import { loadApplicationList } from "@/features/applications/api";
import { parseApplicationFilter, parseDocumentsFilter } from "@/features/applications/schemas";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/applications");
  const params = await searchParams;
  const filter = parseApplicationFilter(params.status);
  const unreviewedDocuments = parseDocumentsFilter(params.documents);
  const supabase = await createSupabaseServerClient();
  const result = await loadApplicationList(supabase, access, filter, { unreviewedDocuments });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Trainers"
        title="Applications"
        description="Trainer applications sent to BRUTAL for review. Filter by status, sort any column, and press j or k to move through rows."
      />
      {result.ok ? (
        <ApplicationTable
          rows={result.rows}
          filter={filter}
          usernamesVisible={result.usernamesVisible}
          truncated={result.truncated}
          documentsFilter={result.documentsFilter}
        />
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}

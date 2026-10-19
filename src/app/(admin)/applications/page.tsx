import { ApplicationTable } from "@/features/applications/components/application-table";
import { loadApplicationList } from "@/features/applications/api";
import { parseApplicationFilter } from "@/features/applications/schemas";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/applications");
  const filter = parseApplicationFilter((await searchParams).status);
  const supabase = await createSupabaseServerClient();
  const result = await loadApplicationList(supabase, access, filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <p className="text-sm text-muted-foreground">
          Trainer applications sent to BRUTAL for review, newest first.
        </p>
      </div>
      {result.ok ? (
        <ApplicationTable
          rows={result.rows}
          filter={filter}
          usernamesVisible={result.usernamesVisible}
          truncated={result.truncated}
        />
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}

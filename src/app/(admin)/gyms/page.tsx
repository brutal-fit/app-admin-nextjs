import { PageHeader } from "@/components/layout/page-header";
import { CreateGymDialog } from "@/features/gyms/components/create-gym-dialog";
import { GymFilters } from "@/features/gyms/components/gym-filters";
import { GymTable } from "@/features/gyms/components/gym-table";
import { loadGymList } from "@/features/gyms/api";
import { parseGymFilters } from "@/features/gyms/schemas";
import { missingPermissionMessage } from "@/features/users/format";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function GymsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/gyms");
  const filters = parseGymFilters(await searchParams);
  const supabase = await createSupabaseServerClient();
  const result = await loadGymList(supabase, filters);
  const canManage = can(access.permissions, "gyms.manage");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Gyms"
        title="Gyms"
        description="Every gym on BRUTAL, submitted ones first: status, area, rating, bookings and services still waiting for a platform price. Open one to verify it, list it or price its services."
        actions={
          canManage ? (
            <CreateGymDialog />
          ) : (
            <p className="text-xs text-muted-foreground">{missingPermissionMessage("gyms.manage", "Creating gyms")}</p>
          )
        }
      />
      <GymFilters filters={filters} />
      {result.ok ? (
        <>
          <GymTable rows={result.rows} filtered={filters.status !== "all" || filters.q !== ""} />
          {result.total > result.rows.length ? (
            <p className="text-xs text-muted-foreground">
              Showing {result.rows.length} of {result.total} gyms. Narrow the search to see the rest.
            </p>
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

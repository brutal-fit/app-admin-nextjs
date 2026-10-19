import { PageHeader } from "@/components/layout/page-header";
import { CreateRoleDialog } from "@/features/roles/components/create-role-dialog";
import { RoleTable } from "@/features/roles/components/role-table";
import { listRoles, type RoleSummary } from "@/lib/db/rbac";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAppError } from "@/lib/supabase/errors";

async function loadRoles(): Promise<{ roles: RoleSummary[] } | { error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    return { roles: await listRoles(supabase) };
  } catch (error) {
    return { error: toAppError(error).message };
  }
}

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRoutePermission("/roles");
  const params = await searchParams;
  const result = await loadRoles();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Access"
        title="Roles"
        description="A role is a named set of permissions. Assign roles to people on the Users page."
        actions={<CreateRoleDialog defaultOpen={params.new === "role"} />}
      />
      {"error" in result ? (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      ) : (
        <RoleTable roles={result.roles} />
      )}
    </div>
  );
}

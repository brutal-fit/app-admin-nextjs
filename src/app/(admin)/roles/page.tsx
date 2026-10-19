import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table } from "@/components/ui/table";
import { CreateRoleDialog } from "@/features/roles/components/create-role-dialog";
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

export default async function RolesPage() {
  await requireRoutePermission("/roles");
  const result = await loadRoles();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Roles</h1>
          <p className="text-sm text-text-muted">
            A role is a named set of permissions. Assign roles to people on the Users page.
          </p>
        </div>
        <CreateRoleDialog />
      </div>
      {"error" in result ? (
        <p role="alert" className="text-sm text-danger">
          {result.error}
        </p>
      ) : (
        <Table
          caption="Roles"
          rows={result.roles}
          rowKey={(role) => role.id}
          empty={<EmptyState title="No roles yet" description="Create the first role." />}
          columns={[
            {
              key: "name",
              header: "Name",
              cell: (role) => (
                <Link
                  href={`/roles/${role.id}`}
                  className="font-medium text-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {role.name}
                </Link>
              ),
            },
            {
              key: "key",
              header: "Key",
              cell: (role) => <code className="text-xs text-text-muted">{role.key}</code>,
            },
            {
              key: "permissions",
              header: "Permissions",
              cell: (role) => role.permissionCount,
            },
            {
              key: "system",
              header: "Type",
              cell: (role) =>
                role.is_system ? <Badge tone="warning">System</Badge> : <Badge>Custom</Badge>,
            },
          ]}
        />
      )}
    </div>
  );
}

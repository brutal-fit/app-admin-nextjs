import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { DeleteRoleButton } from "@/features/roles/components/delete-role-button";
import { PermissionGrid } from "@/features/roles/components/permission-grid";
import { RoleForm } from "@/features/roles/components/role-form";
import { getRole, type RoleDetail } from "@/lib/db/rbac";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAppError } from "@/lib/supabase/errors";

const BACK = { href: "/roles", label: "Back to roles" };

const SYSTEM_ROLE_REASON = "System roles hold every permission and cannot be edited or deleted.";

async function loadRole(id: string): Promise<{ role: RoleDetail } | { error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    return { role: await getRole(supabase, id) };
  } catch (error) {
    return { error: toAppError(error).message };
  }
}

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRoutePermission("/roles/[id]");
  const { id } = await params;
  const result = await loadRole(id);

  if ("error" in result) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Role" back={BACK} />
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { role } = result;
  const lockedReason = role.is_system ? SYSTEM_ROLE_REASON : undefined;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Role"
        title={role.name}
        back={BACK}
        status={
          role.is_system ? (
            <Badge variant="outline" className="border-warning text-warning">
              System
            </Badge>
          ) : null
        }
        description={<code className="text-xs">{role.key}</code>}
      />

      <section aria-labelledby="role-details" className="flex max-w-xl flex-col gap-4">
        <h2 id="role-details" className="text-lg font-semibold">
          Details
        </h2>
        <RoleForm
          key={`${role.name}|${role.description}|${role.is_admin}`}
          mode="edit"
          role={{
            id: role.id,
            name: role.name,
            description: role.description,
            isAdmin: role.is_admin,
          }}
          disabledReason={lockedReason}
        />
      </section>

      <section aria-labelledby="role-permissions" className="flex flex-col gap-4">
        <h2 id="role-permissions" className="text-lg font-semibold">
          Permissions
        </h2>
        <PermissionGrid
          key={[...role.permissionKeys].sort().join(",")}
          roleId={role.id}
          savedKeys={role.permissionKeys}
          disabledReason={lockedReason}
        />
      </section>

      <section aria-labelledby="role-danger" className="flex flex-col gap-4">
        <h2 id="role-danger" className="text-lg font-semibold">
          Delete
        </h2>
        <DeleteRoleButton roleId={role.id} roleName={role.name} disabledReason={lockedReason} />
      </section>
    </div>
  );
}

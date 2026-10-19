import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { DeleteRoleButton } from "@/features/roles/components/delete-role-button";
import { PermissionGrid } from "@/features/roles/components/permission-grid";
import { RoleForm } from "@/features/roles/components/role-form";
import { getRole, type RoleDetail } from "@/lib/db/rbac";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAppError } from "@/lib/supabase/errors";

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
        <Link href="/roles" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to roles
        </Link>
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
      <div className="flex flex-col gap-2">
        <Link href="/roles" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to roles
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{role.name}</h1>
          {role.is_system ? (
            <Badge variant="outline" className="border-warning text-warning">
              System
            </Badge>
          ) : null}
        </div>
        <code className="text-xs text-muted-foreground">{role.key}</code>
      </div>

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

import Link from "next/link";
import { Can } from "@/components/rbac/can";
import { Badge } from "@/components/ui/badge";
import { GrantTrainerAccess } from "@/features/users/components/grant-trainer-access";
import { UserRolesPanel, type AssignedRole } from "@/features/users/components/user-roles-panel";
import { getUser, listRoles, listUserRoleGrants } from "@/lib/db/rbac";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAppError } from "@/lib/supabase/errors";

async function loadUser(userId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const [user, grants, roles] = await Promise.all([
      getUser(supabase, userId),
      listUserRoleGrants(supabase, userId),
      listRoles(supabase),
    ]);
    const rolesById = new Map(roles.map((role) => [role.id, role]));
    const assigned: AssignedRole[] = grants.map((grant) => {
      const role = rolesById.get(grant.roleId);
      return {
        roleId: grant.roleId,
        key: role?.key ?? "unknown",
        name: role?.name ?? "Unknown role",
        isSystem: role?.is_system ?? false,
        grantedAt: grant.grantedAt,
      };
    });
    const available = roles.map((role) => ({ id: role.id, name: role.name, key: role.key }));
    return { ok: true as const, user, assigned, available };
  } catch (error) {
    return { ok: false as const, error: toAppError(error).message };
  }
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRoutePermission("/users/[id]");
  const { id } = await params;
  const result = await loadUser(id);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/users" className="text-sm text-text-muted hover:text-text">
          Back to users
        </Link>
        <p role="alert" className="text-sm text-danger">
          {result.error}
        </p>
      </div>
    );
  }

  const { user, assigned, available } = result;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/users" className="text-sm text-text-muted hover:text-text">
          Back to users
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{user.full_name || "Unnamed"}</h1>
          <Badge tone={user.account_status === "active" ? "success" : "danger"}>
            {user.account_status}
          </Badge>
        </div>
        <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-text-muted">Email</dt>
          <dd>{user.email ?? "No email"}</dd>
          <dt className="text-text-muted">App role</dt>
          <dd>{user.platform_role ?? "None"}</dd>
          <dt className="text-text-muted">Joined</dt>
          <dd>{new Date(user.created_at).toLocaleDateString("en-IN")}</dd>
        </dl>
      </div>

      <section aria-labelledby="user-roles" className="flex max-w-2xl flex-col gap-4">
        <h2 id="user-roles" className="text-lg font-semibold">
          Admin roles
        </h2>
        <Can
          permission="users.manage"
          fallback={
            <p className="text-sm text-text-muted">
              {assigned.length === 0
                ? "No admin roles."
                : assigned.map((role) => role.name).join(", ")}
            </p>
          }
        >
          <UserRolesPanel userId={user.id} assigned={assigned} available={available} />
        </Can>
      </section>

      <Can permission="users.manage">
        <section aria-labelledby="user-app-access" className="flex max-w-2xl flex-col gap-4">
          <h2 id="user-app-access" className="text-lg font-semibold">
            App access
          </h2>
          <GrantTrainerAccess userId={user.id} platformRole={user.platform_role} />
        </section>
      </Can>
    </div>
  );
}

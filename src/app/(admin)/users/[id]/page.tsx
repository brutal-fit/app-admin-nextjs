import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
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

const BACK = { href: "/users", label: "Back to users" };

function statusTone(status: "active" | "suspended"): string {
  return status === "active" ? "border-success text-success" : "border-destructive text-destructive";
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRoutePermission("/users/[id]");
  const { id } = await params;
  const result = await loadUser(id);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="User" back={BACK} />
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { user, assigned, available } = result;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="User"
        title={user.full_name || "Unnamed"}
        back={BACK}
        status={
          <StatusPulse value={user.account_status} className={statusTone(user.account_status)}>
            <Badge variant="outline" className={statusTone(user.account_status)}>
              {user.account_status}
            </Badge>
          </StatusPulse>
        }
      >
        <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-xl border bg-card p-4 text-sm shadow-tile">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{user.email ?? "No email"}</dd>
          <dt className="text-muted-foreground">App role</dt>
          <dd>{user.platform_role ?? "None"}</dd>
          <dt className="text-muted-foreground">Joined</dt>
          <dd>{new Date(user.created_at).toLocaleDateString("en-IN")}</dd>
        </dl>
      </PageHeader>

      <section aria-labelledby="user-roles" className="flex max-w-2xl flex-col gap-4">
        <h2 id="user-roles" className="text-lg font-semibold">
          Admin roles
        </h2>
        <Can
          permission="users.manage"
          fallback={
            <p className="text-sm text-muted-foreground">
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

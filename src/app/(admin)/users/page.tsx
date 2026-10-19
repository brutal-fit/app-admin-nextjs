import { Can } from "@/components/rbac/can";
import { CreateUserDialog } from "@/features/users/components/create-user-dialog";
import { UserSearch } from "@/features/users/components/user-search";
import { USER_PAGE_SIZE } from "@/features/users/schemas";
import { listRoles, listUsers } from "@/lib/db/rbac";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAppError } from "@/lib/supabase/errors";
import { isServiceRoleConfigured } from "@/server/service-client";

export default async function UsersPage() {
  await requireRoutePermission("/users");
  const supabase = await createSupabaseServerClient();
  const [users, roles] = await Promise.allSettled([
    listUsers(supabase, { query: "", limit: USER_PAGE_SIZE, offset: 0 }),
    listRoles(supabase),
  ]);
  const assignable =
    roles.status === "fulfilled"
      ? roles.value.map((role) => ({ id: role.id, name: role.name, key: role.key }))
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-text-muted">
            Everyone with an account: clients, trainers and admins.
          </p>
        </div>
        <Can permission="users.manage">
          <CreateUserDialog serviceRoleConfigured={isServiceRoleConfigured()} roles={assignable} />
        </Can>
      </div>
      {users.status === "fulfilled" ? (
        <UserSearch initialUsers={users.value} />
      ) : (
        <p role="alert" className="text-sm text-danger">
          {toAppError(users.reason).message}
        </p>
      )}
    </div>
  );
}

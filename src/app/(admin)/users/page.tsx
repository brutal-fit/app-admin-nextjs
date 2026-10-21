import { PageHeader } from "@/components/layout/page-header";
import { Can } from "@/components/rbac/can";
import { CreateUserDialog } from "@/features/users/components/create-user-dialog";
import { UserSearch } from "@/features/users/components/user-search";
import { USER_MAX_PAGE, USER_PAGE_SIZE, parseUserFilters } from "@/features/users/schemas";
import { listUserAvatarsOrEmpty } from "@/lib/db/avatars";
import { listRoles, listUsers } from "@/lib/db/rbac";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAppError } from "@/lib/supabase/errors";
import { daysAgoIso } from "@/lib/utils/time";
import { isServiceRoleConfigured } from "@/server/service-client";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/users");
  const params = await searchParams;
  const initialFilters = parseUserFilters(params.joined);
  // The "joined" link (dashboard tile) loads the largest page so the filter sees every
  // recent account up to the function's cap.
  const pageSize = initialFilters.length > 0 ? USER_MAX_PAGE : USER_PAGE_SIZE;
  const supabase = await createSupabaseServerClient();
  const [users, roles] = await Promise.allSettled([
    listUsers(supabase, { query: "", limit: pageSize, offset: 0 }),
    listRoles(supabase),
  ]);
  // One batch call for the rows shown; a failure only costs the avatars.
  const avatars =
    users.status === "fulfilled"
      ? await listUserAvatarsOrEmpty(
          supabase,
          access.permissions,
          users.value.map((user) => user.id),
        )
      : {};
  const assignable =
    roles.status === "fulfilled"
      ? roles.value.map((role) => ({ id: role.id, name: role.name, key: role.key }))
      : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Everyone with an account: clients, trainers and admins. Press / to search."
        actions={
          <Can permission="users.manage">
            <CreateUserDialog
              serviceRoleConfigured={isServiceRoleConfigured()}
              roles={assignable}
              defaultOpen={params.new === "user"}
            />
          </Can>
        }
      />
      {users.status === "fulfilled" ? (
        <UserSearch
          initialUsers={users.value}
          initialAvatars={avatars}
          initialFilters={initialFilters}
          joinedSince={daysAgoIso(7)}
          pageSize={pageSize}
        />
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {toAppError(users.reason).message}
        </p>
      )}
    </div>
  );
}

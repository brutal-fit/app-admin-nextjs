/*
 * The RBAC data layer. This is the only file in src/ that spells table or function names, so
 * a change to the schema after the owner approves task 05 touches this folder only. Every
 * wrapper throws AppError (via toAppError) on failure.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { SessionAccess } from "@/types/access";
import type { AdminUserRow, RoleRow, UserRole } from "@/types/database";

const TABLE = {
  roles: "roles",
  rolePermissions: "role_permissions",
  userRoles: "user_roles",
} as const;

const RPC = {
  myAccess: "my_access",
  createRole: "admin_create_role",
  updateRole: "admin_update_role",
  deleteRole: "admin_delete_role",
  setRolePermissions: "admin_set_role_permissions",
  assignRole: "admin_assign_role",
  revokeRole: "admin_revoke_role",
  setPlatformRole: "admin_set_platform_role",
  listUsers: "admin_list_users",
  getUser: "admin_get_user",
} as const;

export type RoleSummary = RoleRow & { permissionCount: number };
export type RoleDetail = RoleRow & { permissionKeys: string[] };
export type UserRoleGrant = { roleId: string; grantedAt: string; grantedBy: string | null };

// my_access returns jsonb, so it is validated before the panel trusts it.
const myAccessSchema = z.object({
  user_id: z.string(),
  full_name: z.string().nullable().optional(),
  platform_role: z.enum(["client", "trainer"]).nullable().optional(),
  account_status: z.enum(["active", "suspended"]),
  roles: z.array(z.object({ key: z.string(), name: z.string() })).nullable().optional(),
  permissions: z.array(z.string()).nullable().optional(),
});

export async function getMyAccess(client: AppSupabaseClient): Promise<SessionAccess> {
  const { data, error } = await client.rpc(RPC.myAccess);
  if (error) throw toAppError(error);
  const parsed = myAccessSchema.safeParse(data);
  if (!parsed.success) throw new AppError("UNKNOWN", "The access check returned an unexpected shape.");
  const access = parsed.data;
  return {
    userId: access.user_id,
    fullName: access.full_name ?? "",
    platformRole: access.platform_role ?? null,
    accountStatus: access.account_status,
    roles: access.roles ?? [],
    permissions: access.permissions ?? [],
  };
}

export async function listRoles(client: AppSupabaseClient): Promise<RoleSummary[]> {
  const [roles, links] = await Promise.all([
    client.from(TABLE.roles).select("*").order("is_system", { ascending: false }).order("name"),
    client.from(TABLE.rolePermissions).select("role_id"),
  ]);
  if (roles.error) throw toAppError(roles.error);
  if (links.error) throw toAppError(links.error);
  const counts = new Map<string, number>();
  for (const link of links.data) counts.set(link.role_id, (counts.get(link.role_id) ?? 0) + 1);
  return roles.data.map((role) => ({ ...role, permissionCount: counts.get(role.id) ?? 0 }));
}

export async function countRoles(client: AppSupabaseClient): Promise<number> {
  const { count, error } = await client
    .from(TABLE.roles)
    .select("id", { count: "exact", head: true });
  if (error) throw toAppError(error);
  return count ?? 0;
}

export async function getRole(client: AppSupabaseClient, id: string): Promise<RoleDetail> {
  const [role, links] = await Promise.all([
    client.from(TABLE.roles).select("*").eq("id", id).maybeSingle(),
    client.from(TABLE.rolePermissions).select("permission_key").eq("role_id", id),
  ]);
  if (role.error) throw toAppError(role.error);
  if (links.error) throw toAppError(links.error);
  if (!role.data) throw new AppError("BRNTF", "This role does not exist.");
  return { ...role.data, permissionKeys: links.data.map((link) => link.permission_key) };
}

export async function createRole(
  client: AppSupabaseClient,
  input: { key: string; name: string; description: string },
): Promise<RoleRow> {
  const { data, error } = await client.rpc(RPC.createRole, {
    p_key: input.key,
    p_name: input.name,
    p_description: input.description,
  });
  if (error) throw toAppError(error);
  return data;
}

export async function updateRole(
  client: AppSupabaseClient,
  input: { id: string; name: string; description: string },
): Promise<RoleRow> {
  const { data, error } = await client.rpc(RPC.updateRole, {
    p_id: input.id,
    p_name: input.name,
    p_description: input.description,
  });
  if (error) throw toAppError(error);
  return data;
}

export async function deleteRole(client: AppSupabaseClient, id: string): Promise<void> {
  const { error } = await client.rpc(RPC.deleteRole, { p_id: id });
  if (error) throw toAppError(error);
}

/** Replaces the role's whole permission set; the server rejects unknown keys (BRVAL). */
export async function setRolePermissions(
  client: AppSupabaseClient,
  roleId: string,
  permissionKeys: readonly string[],
): Promise<void> {
  const { error } = await client.rpc(RPC.setRolePermissions, {
    p_role_id: roleId,
    p_permission_keys: [...permissionKeys],
  });
  if (error) throw toAppError(error);
}

export async function listUsers(
  client: AppSupabaseClient,
  input: { query: string; limit: number; offset: number },
): Promise<AdminUserRow[]> {
  const { data, error } = await client.rpc(RPC.listUsers, {
    p_query: input.query,
    p_limit: input.limit,
    p_offset: input.offset,
  });
  if (error) throw toAppError(error);
  return data;
}

/**
 * Total users visible to the caller. Assumes admin_list_users treats a null limit as no
 * limit (plain `limit p_limit`); confirm when task 05 lands, or switch to a count function.
 */
export async function countUsers(client: AppSupabaseClient): Promise<number> {
  const { count, error } = await client
    .rpc(RPC.listUsers, { p_query: "", p_limit: null, p_offset: 0 }, { count: "exact" })
    .select("id");
  if (error) throw toAppError(error);
  return count ?? 0;
}

export async function getUser(
  client: AppSupabaseClient,
  userId: string,
): Promise<AdminUserRow> {
  const { data, error } = await client.rpc(RPC.getUser, { p_user_id: userId }).maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError("BRNTF", "This user does not exist.");
  return data;
}

export async function listUserRoleGrants(
  client: AppSupabaseClient,
  userId: string,
): Promise<UserRoleGrant[]> {
  const { data, error } = await client
    .from(TABLE.userRoles)
    .select("role_id, granted_at, granted_by")
    .eq("user_id", userId)
    .order("granted_at");
  if (error) throw toAppError(error);
  return data.map((row) => ({
    roleId: row.role_id,
    grantedAt: row.granted_at,
    grantedBy: row.granted_by,
  }));
}

export async function assignRole(
  client: AppSupabaseClient,
  input: { userId: string; roleId: string },
): Promise<void> {
  const { error } = await client.rpc(RPC.assignRole, {
    p_user_id: input.userId,
    p_role_id: input.roleId,
  });
  if (error) throw toAppError(error);
}

export async function revokeRole(
  client: AppSupabaseClient,
  input: { userId: string; roleId: string },
): Promise<void> {
  const { error } = await client.rpc(RPC.revokeRole, {
    p_user_id: input.userId,
    p_role_id: input.roleId,
  });
  if (error) throw toAppError(error);
}

/** Sets the app platform role; the server allows it only while the profile role is null. */
export async function setPlatformRole(
  client: AppSupabaseClient,
  input: { userId: string; role: UserRole },
): Promise<void> {
  const { error } = await client.rpc(RPC.setPlatformRole, {
    p_user_id: input.userId,
    p_role: input.role,
  });
  if (error) throw toAppError(error);
}

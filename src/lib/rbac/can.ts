import type { PermissionKey } from "@/lib/rbac/permissions";
import type { SessionAccess } from "@/types/access";

/** True when the permission list holds the key. Pure, so client and server share it. */
export function can(
  permissions: readonly string[] | null | undefined,
  key: PermissionKey,
): boolean {
  return permissions?.includes(key) ?? false;
}

/**
 * True when the account may use the panel: the server says it holds an admin role
 * (`admin_access`), and that role set grants at least one permission. The second check is a
 * fallback, so an admin role with no permissions still lands on the login page with a reason
 * instead of an empty shell. Sign-in and every request use this same rule.
 */
export function hasPanelAccess(
  access: Pick<SessionAccess, "adminAccess" | "permissions">,
): boolean {
  return access.adminAccess && access.permissions.length > 0;
}

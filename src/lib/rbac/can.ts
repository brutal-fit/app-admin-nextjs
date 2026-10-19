import type { PermissionKey } from "@/lib/rbac/permissions";

/** True when the permission list holds the key. Pure, so client and server share it. */
export function can(
  permissions: readonly string[] | null | undefined,
  key: PermissionKey,
): boolean {
  return permissions?.includes(key) ?? false;
}

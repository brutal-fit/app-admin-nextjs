import { z } from "zod";
import { isPermissionKey, type PermissionKey } from "@/lib/rbac/permissions";

export const ROLE_KEY_PATTERN = /^[a-z][a-z0-9_]{2,40}$/;

// Limits mirror the roles table checks (name 2..60, description <= 300) so a long value
// fails here with a message instead of as a check violation from the database.
const roleName = z
  .string()
  .trim()
  .min(2, "Name needs at least 2 characters.")
  .max(60, "Keep the name to 60 characters or fewer.");
const roleDescription = z.string().trim().max(300, "Keep the description under 300 characters.");
const roleId = z.guid("Unknown role.");
// Holding a role with this flag admits the user to the panel; new roles default to it.
const roleIsAdmin = z.boolean();

export const createRoleSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(
      ROLE_KEY_PATTERN,
      "Key: 3 to 41 characters, lowercase letters, digits and underscores, starting with a letter.",
    ),
  name: roleName,
  description: roleDescription,
  isAdmin: roleIsAdmin,
});

export const updateRoleSchema = z.object({
  id: roleId,
  name: roleName,
  description: roleDescription,
  isAdmin: roleIsAdmin,
});

export const deleteRoleSchema = z.object({ id: roleId });

export const setRolePermissionsSchema = z.object({
  roleId,
  permissionKeys: z.array(
    z.custom<PermissionKey>(
      (value) => typeof value === "string" && isPermissionKey(value),
      "Unknown permission.",
    ),
  ),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

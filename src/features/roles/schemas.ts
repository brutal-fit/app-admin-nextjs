import { z } from "zod";
import { isPermissionKey, type PermissionKey } from "@/lib/rbac/permissions";

export const ROLE_KEY_PATTERN = /^[a-z][a-z0-9_]{2,40}$/;

const roleName = z.string().trim().min(2, "Name needs at least 2 characters.").max(80);
const roleDescription = z.string().trim().max(500, "Keep the description under 500 characters.");
const roleId = z.guid("Unknown role.");

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
});

export const updateRoleSchema = z.object({
  id: roleId,
  name: roleName,
  description: roleDescription,
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

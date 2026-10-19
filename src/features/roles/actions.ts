"use server";

import { refresh } from "next/cache";
import { createRole, deleteRole, setRolePermissions, updateRole } from "@/lib/db/rbac";
import { runAction } from "@/server/run-action";
import {
  createRoleSchema,
  deleteRoleSchema,
  setRolePermissionsSchema,
  updateRoleSchema,
} from "@/features/roles/schemas";
import type { ActionResult } from "@/types/action-result";

export async function createRoleAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(createRoleSchema, input, "rbac.manage", async (data, { supabase }) => {
    const role = await createRole(supabase, data);
    refresh();
    return { id: role.id };
  });
}

export async function updateRoleAction(input: unknown): Promise<ActionResult> {
  return runAction(updateRoleSchema, input, "rbac.manage", async (data, { supabase }) => {
    await updateRole(supabase, data);
    refresh();
    return undefined;
  });
}

export async function deleteRoleAction(input: unknown): Promise<ActionResult> {
  return runAction(deleteRoleSchema, input, "rbac.manage", async (data, { supabase }) => {
    await deleteRole(supabase, data.id);
    return undefined;
  });
}

export async function setRolePermissionsAction(input: unknown): Promise<ActionResult> {
  return runAction(setRolePermissionsSchema, input, "rbac.manage", async (data, { supabase }) => {
    await setRolePermissions(supabase, data.roleId, data.permissionKeys);
    refresh();
    return undefined;
  });
}

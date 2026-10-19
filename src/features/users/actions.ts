"use server";

import { refresh } from "next/cache";
import { assignRole, listUsers, revokeRole, setPlatformRole } from "@/lib/db/rbac";
import { runAction } from "@/server/run-action";
import { grantTrainerAccessSchema, listUsersSchema, userRoleSchema } from "@/features/users/schemas";
import type { ActionResult } from "@/types/action-result";
import type { AdminUserRow } from "@/types/database";

export async function listUsersAction(input: unknown): Promise<ActionResult<AdminUserRow[]>> {
  return runAction(listUsersSchema, input, "users.read", (data, { supabase }) =>
    listUsers(supabase, data),
  );
}

export async function assignRoleAction(input: unknown): Promise<ActionResult> {
  return runAction(userRoleSchema, input, "users.manage", async (data, { supabase }) => {
    await assignRole(supabase, data);
    refresh();
    return undefined;
  });
}

export async function revokeRoleAction(input: unknown): Promise<ActionResult> {
  return runAction(userRoleSchema, input, "users.manage", async (data, { supabase }) => {
    await revokeRole(supabase, data);
    refresh();
    return undefined;
  });
}

export async function grantTrainerAccessAction(input: unknown): Promise<ActionResult> {
  return runAction(grantTrainerAccessSchema, input, "users.manage", async (data, { supabase }) => {
    await setPlatformRole(supabase, { userId: data.userId, role: "trainer" });
    refresh();
    return undefined;
  });
}

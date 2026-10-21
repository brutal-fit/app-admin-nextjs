"use server";

import { refresh } from "next/cache";
import { listUserAvatars, type UserAvatarMap } from "@/lib/db/avatars";
import { assignRole, listUsers, revokeRole, setPlatformRole } from "@/lib/db/rbac";
import { processPrivacyRequest, setAccountStatus } from "@/lib/db/users";
import { runAction } from "@/server/run-action";
import {
  grantTrainerAccessSchema,
  listUsersSchema,
  processPrivacyRequestSchema,
  setAccountStatusSchema,
  userAvatarsSchema,
  userRoleSchema,
} from "@/features/users/schemas";
import type { ActionResult } from "@/types/action-result";
import type { AccountStatus, AdminUserRow } from "@/types/database";

export async function listUsersAction(input: unknown): Promise<ActionResult<AdminUserRow[]>> {
  return runAction(listUsersSchema, input, "users.read", (data, { supabase }) =>
    listUsers(supabase, data),
  );
}

/** Avatars for the rows a search returned; the caller keeps initials when this fails. */
export async function userAvatarsAction(input: unknown): Promise<ActionResult<UserAvatarMap>> {
  return runAction(userAvatarsSchema, input, "users.read", (data, { supabase }) =>
    listUserAvatars(supabase, data.ids),
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

/**
 * Suspends or reinstates through admin_set_account_status, then refresh() re-reads the user
 * so the status pill shows what the server stored. Returns the status the server answered.
 */
export async function setAccountStatusAction(
  input: unknown,
): Promise<ActionResult<{ accountStatus: AccountStatus }>> {
  return runAction(setAccountStatusSchema, input, "users.suspend", async (data, { supabase }) => {
    const change = await setAccountStatus(supabase, data);
    refresh();
    return { accountStatus: change.account_status };
  });
}

export async function processPrivacyRequestAction(input: unknown): Promise<ActionResult> {
  return runAction(processPrivacyRequestSchema, input, "privacy.process", async (data, { supabase }) => {
    await processPrivacyRequest(supabase, data);
    refresh();
    return undefined;
  });
}

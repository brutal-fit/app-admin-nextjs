/*
 * The accounts data layer: the only file in src/ that spells the user 360, account status and
 * privacy processing function names (20261019000400_adminops_support_accounts.sql). Every call
 * runs with the admin's own session; the functions check the key themselves (users.read to
 * read, users.suspend to change the status, privacy.process to resolve a request) and fail
 * through private.fail. Every wrapper throws AppError (via toAppError) on failure.
 * admin_get_user and its callers stay in rbac.ts, unchanged.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { AccountStatus, PrivacyOutcome } from "@/types/database";

const RPC = {
  detail: "admin_get_user_detail",
  setStatus: "admin_set_account_status",
  processPrivacy: "admin_process_privacy_request",
} as const;

const ACCOUNT_STATUS_VALUES = ["active", "suspended"] as const satisfies readonly AccountStatus[];

const text = z.string().nullable().optional();
const count = z.number().int().nonnegative();

const privacyRequestSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  kind: z.enum(["data_export", "account_deletion"]),
  reason: text,
  // received until processed, then completed or rejected; other values are shown as they are.
  status: z.string(),
  created_at: z.string(),
  resolution_note: text,
  resolved_at: text,
  resolved_by: text,
});

const auditEntrySchema = z.object({
  id: z.union([z.number(), z.string()]),
  actor_id: text,
  actor_name: text,
  action: z.string(),
  details: z.json().nullable().optional(),
  created_at: z.string(),
});

// The detail is jsonb, so its shape is checked before the panel renders it.
const userDetailSchema = z.object({
  id: z.string(),
  full_name: text,
  email: text,
  username: text,
  platform_role: z.enum(["client", "trainer"]).nullable().optional(),
  account_status: z.enum(ACCOUNT_STATUS_VALUES),
  roles: z.array(z.string()),
  created_at: z.string(),
  counts: z.object({
    // Every booking status, zero included, as client or trainer.
    bookings: z.record(z.string(), count),
    open_cases: count,
    reviews_written: count,
    reviews_received: count,
  }),
  recent_audit: z.array(auditEntrySchema),
  privacy_requests: z.array(privacyRequestSchema),
});

export type UserDetail = z.infer<typeof userDetailSchema>;
export type UserAuditEntry = UserDetail["recent_audit"][number];
export type PrivacyRequest = z.infer<typeof privacyRequestSchema>;

const statusChangeSchema = z.object({
  id: z.string(),
  account_status: z.enum(ACCOUNT_STATUS_VALUES),
  previous_status: z.enum(ACCOUNT_STATUS_VALUES).nullable().optional(),
});

export type AccountStatusChange = z.infer<typeof statusChangeSchema>;

function parse<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new AppError("UNKNOWN", `The ${what} came back in a shape the panel does not know.`);
  }
  return parsed.data;
}

/** Profile, admin role keys, counts, the last five audit entries and every privacy request. */
export async function getUserDetail(client: AppSupabaseClient, userId: string): Promise<UserDetail> {
  const { data, error } = await client.rpc(RPC.detail, { p_id: userId });
  if (error) throw toAppError(error);
  return parse(userDetailSchema, data, "user");
}

/**
 * Suspends or reinstates an account with a reason. The function refuses the caller's own
 * account and super admins, audits the change and notifies the user on reinstatement.
 */
export async function setAccountStatus(
  client: AppSupabaseClient,
  input: { userId: string; status: AccountStatus; reason: string },
): Promise<AccountStatusChange> {
  const { data, error } = await client.rpc(RPC.setStatus, {
    p_user: input.userId,
    p_status: input.status,
    p_reason: input.reason,
  });
  if (error) throw toAppError(error);
  return parse(statusChangeSchema, data, "account status");
}

/** Marks a privacy request completed or rejected; audited, and the user is notified. */
export async function processPrivacyRequest(
  client: AppSupabaseClient,
  input: { requestId: string; outcome: PrivacyOutcome; note: string | null },
): Promise<PrivacyRequest> {
  const { data, error } = await client.rpc(RPC.processPrivacy, {
    p_id: input.requestId,
    p_outcome: input.outcome,
    p_note: input.note,
  });
  if (error) throw toAppError(error);
  return parse(privacyRequestSchema, data, "privacy request");
}

/*
 * Server-side loader for the privacy queue (privacy.process). One admin_list_privacy_requests
 * call per page; the function orders waiting requests first and counts the matches.
 */
import { listPrivacyRequests, type PrivacyRequestListRow } from "@/lib/db/users";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { formatWaiting } from "@/lib/utils/time";
import { PRIVACY_PAGE_SIZE, type PrivacyFilters } from "@/features/privacy/schemas";

export type PrivacyQueueItem = PrivacyRequestListRow & {
  /** How long the request has waited ("3 days"); null once it is processed. */
  waiting: string | null;
};

export type PrivacyQueueResult =
  | { ok: true; rows: PrivacyQueueItem[]; total: number; hasNext: boolean }
  | { ok: false; error: string };

const FINAL_STATUSES: ReadonlySet<string> = new Set(["completed", "rejected"]);

export async function loadPrivacyQueue(
  client: AppSupabaseClient,
  filters: PrivacyFilters,
  now: number,
): Promise<PrivacyQueueResult> {
  const offset = (filters.page - 1) * PRIVACY_PAGE_SIZE;
  try {
    const { rows, total } = await listPrivacyRequests(client, {
      status: filters.status,
      kind: filters.kind,
      limit: PRIVACY_PAGE_SIZE,
      offset,
    });
    return {
      ok: true,
      rows: rows.map((row) => ({
        ...row,
        waiting: FINAL_STATUSES.has(row.status) ? null : formatWaiting(row.created_at, now),
      })),
      total,
      hasNext: offset + rows.length < total,
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

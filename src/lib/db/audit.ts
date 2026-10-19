/*
 * The audit log data layer for the audit page and its CSV export: admin_list_audit with
 * filters (20261019000700). Calls run with the admin's session; the function checks
 * audit.read, and audit.export for any call over AUDIT_PAGE_MAX rows. Arguments are always
 * named: the filters sit before p_limit, so a positional call fails. Throws AppError.
 */
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { AdminAuditListRow } from "@/types/database";

const RPC = { list: "admin_list_audit" } as const;

/** The largest call that needs only audit.read. */
export const AUDIT_PAGE_MAX = 1000;
/** The largest call the function answers (with audit.export). */
export const AUDIT_CALL_MAX = 10000;

export type AuditQuery = {
  actorId: string | null;
  action: string | null;
  targetId: string | null;
  /** UTC instants; `to` is exclusive. */
  from: string | null;
  to: string | null;
  search: string | null;
  limit: number;
  offset: number;
};

export type AuditListPage = {
  rows: AdminAuditListRow[];
  /** Every row the filters match, not only this page. */
  total: number;
};

export async function listAuditLog(client: AppSupabaseClient, query: AuditQuery): Promise<AuditListPage> {
  const { data, error } = await client.rpc(RPC.list, {
    p_actor: query.actorId,
    p_action: query.action,
    p_target: query.targetId,
    p_from: query.from,
    p_to: query.to,
    p_search: query.search,
    p_limit: query.limit,
    p_offset: query.offset,
  });
  if (error) throw toAppError(error);
  const rows = data ?? [];
  // bigint arrives as a number; an empty page carries no count, which means none matched
  // at this offset (the caller knows the offset).
  return { rows, total: rows.length > 0 ? Number(rows[0]?.total_count ?? 0) : 0 };
}

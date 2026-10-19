/*
 * Server loader for the audit page. The route needs audit.read; the actor picker lists the
 * team only with users.read (as the support queue does).
 */
import { loadTeam, type TeamState } from "@/features/support/api";
import { listAuditLog } from "@/lib/db/audit";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { istDatesToRange } from "@/lib/utils/time";
import type { SessionAccess } from "@/types/access";
import type { AdminAuditListRow } from "@/types/database";
import { AUDIT_PAGE_SIZE, invalidAuditRange, type AuditFilters } from "@/features/audit/schemas";

export type AuditPageResult =
  | {
      ok: true;
      rows: AdminAuditListRow[];
      /** Every entry the filters match. */
      total: number;
      hasNext: boolean;
      /** The actor filter's name, when a row on this page carries it. */
      actorName: string | null;
      team: TeamState;
    }
  | { ok: false; error: string; team: TeamState };

export const INVALID_RANGE_MESSAGE = "The end date is before the start date. Change one of them.";

export async function loadAuditPage(
  client: AppSupabaseClient,
  access: SessionAccess,
  filters: AuditFilters,
): Promise<AuditPageResult> {
  const teamPromise = loadTeam(client, access);
  if (invalidAuditRange(filters)) {
    return { ok: false, error: INVALID_RANGE_MESSAGE, team: await teamPromise };
  }
  const range = istDatesToRange(filters.from, filters.to);
  const offset = (filters.page - 1) * AUDIT_PAGE_SIZE;
  try {
    const [page, team] = await Promise.all([
      listAuditLog(client, {
        actorId: filters.actorId,
        action: filters.action,
        targetId: filters.targetId,
        from: range.from,
        to: range.to,
        search: filters.search || null,
        limit: AUDIT_PAGE_SIZE,
        offset,
      }),
      teamPromise,
    ]);
    return {
      ok: true,
      rows: page.rows,
      total: page.total,
      hasNext: page.rows.length > 0 && offset + page.rows.length < page.total,
      actorName: filters.actorId ? (page.rows[0]?.actor_name ?? null) : null,
      team,
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message, team: await teamPromise };
  }
}

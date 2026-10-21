/*
 * Server-side loaders for the support pages. They compose the data layer (src/lib/db) and
 * decide what the session may see, so pages stay thin. Not for client components: they need
 * the server Supabase client.
 */
import {
  getSupportCase,
  listSupportCases,
  listTeam,
  type SupportCaseDetail,
} from "@/lib/db/support";
import { listUserAvatarsOrEmpty } from "@/lib/db/avatars";
import { can } from "@/lib/rbac/can";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { AvatarRef } from "@/lib/utils/avatar";
import type { SessionAccess } from "@/types/access";
import type { SupportCaseListRow } from "@/types/database";
import {
  SUPPORT_PAGE_SIZE,
  supportCaseIdSchema,
  type SupportFilters,
} from "@/features/support/schemas";

export type TeamMember = { id: string; name: string };

/**
 * Who a case can be assigned to: users holding a role with is_admin, which is the rule
 * admin_update_support_case enforces. admin_list_team returns all of them and needs
 * support.read or users.read.
 */
export type TeamState =
  | { kind: "ok"; members: TeamMember[] }
  | { kind: "hidden"; reason: string }
  | { kind: "error"; message: string };

export const TEAM_NEEDS_PERMISSION =
  "Listing the team needs the View support cases or View users permission.";

export type SupportQueueItem = {
  id: string;
  subject: string;
  priority: SupportCaseListRow["priority"];
  category: SupportCaseListRow["category"];
  status: SupportCaseListRow["status"];
  reporterId: string;
  reporterName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  /** From admin_user_avatars; null without users.read or when that call failed (initials). */
  reporterAvatar: AvatarRef | null;
  assigneeAvatar: AvatarRef | null;
  targetLabel: string | null;
  eventCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportQueueResult =
  | { ok: true; rows: SupportQueueItem[]; hasNext: boolean; team: TeamState }
  | { ok: false; error: string };

export type SupportCaseResult =
  | {
      ok: true;
      detail: SupportCaseDetail;
      /** Null when the session cannot assign, so the list is never fetched for nothing. */
      team: TeamState | null;
    }
  | { ok: false; error: string };

export async function loadTeam(
  client: AppSupabaseClient,
  access: SessionAccess,
): Promise<TeamState> {
  if (!can(access.permissions, "support.read") && !can(access.permissions, "users.read")) {
    return { kind: "hidden", reason: TEAM_NEEDS_PERMISSION };
  }
  try {
    const rows = await listTeam(client);
    // The server orders by name; the fallbacks only cover an account without one.
    const members = rows.map((row) => ({ id: row.id, name: row.name || row.email || "Unnamed" }));
    return { kind: "ok", members };
  } catch (error) {
    return { kind: "error", message: toAppError(error).message };
  }
}

function toQueueItem(row: SupportCaseListRow): SupportQueueItem {
  return {
    id: row.id,
    subject: row.subject,
    priority: row.priority,
    category: row.category,
    status: row.status,
    reporterId: row.reporter_id,
    reporterName: row.reporter_name || "Unnamed",
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_id ? row.assignee_name || "Unnamed" : null,
    reporterAvatar: null,
    assigneeAvatar: null,
    targetLabel: row.target_label,
    eventCount: Number(row.event_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadSupportQueue(
  client: AppSupabaseClient,
  access: SessionAccess,
  filters: SupportFilters,
): Promise<SupportQueueResult> {
  try {
    const [rows, team] = await Promise.all([
      // One extra row says whether a next page exists without a count query.
      listSupportCases(client, {
        status: filters.status,
        category: filters.category,
        assigneeId: filters.assigneeId,
        search: filters.search,
        limit: SUPPORT_PAGE_SIZE + 1,
        offset: (filters.page - 1) * SUPPORT_PAGE_SIZE,
      }),
      loadTeam(client, access),
    ]);
    const items = rows.slice(0, SUPPORT_PAGE_SIZE).map(toQueueItem);
    const avatars = await listUserAvatarsOrEmpty(
      client,
      access.permissions,
      items.flatMap((item) => [item.reporterId, item.assigneeId]),
    );
    return {
      ok: true,
      rows: items.map((item) => ({
        ...item,
        reporterAvatar: avatars[item.reporterId] ?? null,
        assigneeAvatar: item.assigneeId ? (avatars[item.assigneeId] ?? null) : null,
      })),
      hasNext: rows.length > SUPPORT_PAGE_SIZE,
      team,
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export async function loadSupportCase(
  client: AppSupabaseClient,
  access: SessionAccess,
  id: string,
): Promise<SupportCaseResult> {
  if (!supportCaseIdSchema.safeParse(id).success) {
    return { ok: false, error: "This support case does not exist." };
  }
  const canAssign =
    can(access.permissions, "support.manage") && can(access.permissions, "support.assign");
  try {
    const [detail, team] = await Promise.all([
      getSupportCase(client, id),
      canAssign ? loadTeam(client, access) : Promise.resolve(null),
    ]);
    return { ok: true, detail, team };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

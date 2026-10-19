/*
 * Server-side loaders for the announcements page (announcements.send). Names of senders and
 * of a one-person audience need users.read; the recipient estimate needs users.read too
 * (and applications.read for a city), and says which key is missing instead of guessing.
 */
import {
  listAnnouncements,
  listTrainerIdsInCity,
} from "@/lib/db/announcements";
import { listActiveCatalogue } from "@/lib/db/catalogue";
import { getUser, listUsers } from "@/lib/db/rbac";
import { can } from "@/lib/rbac/can";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { SessionAccess } from "@/types/access";
import type { AdminUserRow, AnnouncementRow } from "@/types/database";
import { missingPermissionMessage } from "@/features/users/format";
import {
  ANNOUNCEMENT_HISTORY_LIMIT,
  ESTIMATE_MAX_PAGES,
  ESTIMATE_PAGE_SIZE,
  type RecipientEstimate,
  type Segment,
} from "@/features/announcements/schemas";

export type CityChoice = { key: string; label: string };

export type AnnouncementsPageResult = {
  history: { ok: true; rows: AnnouncementRow[] } | { ok: false; error: string };
  /** User id to display name, for senders and one-person audiences; empty without users.read. */
  names: Record<string, string>;
  cities: { ok: true; items: CityChoice[] } | { ok: false; error: string };
};

function audienceUserId(row: AnnouncementRow): string | null {
  const segment = row.segment;
  if (segment && typeof segment === "object" && !Array.isArray(segment)) {
    const id = segment.user_id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

export async function loadAnnouncementsPage(
  client: AppSupabaseClient,
  access: SessionAccess,
): Promise<AnnouncementsPageResult> {
  const [history, cities] = await Promise.all([
    listAnnouncements(client, ANNOUNCEMENT_HISTORY_LIMIT).then(
      (rows) => ({ ok: true as const, rows }),
      (error: unknown) => ({ ok: false as const, error: toAppError(error).message }),
    ),
    listActiveCatalogue(client, "city").then(
      (rows) => ({ ok: true as const, items: rows.map((row) => ({ key: row.key, label: row.label })) }),
      (error: unknown) => ({ ok: false as const, error: toAppError(error).message }),
    ),
  ]);

  const names: Record<string, string> = {};
  if (history.ok && can(access.permissions, "users.read")) {
    const ids = new Set<string>();
    for (const row of history.rows) {
      ids.add(row.sent_by);
      const userId = audienceUserId(row);
      if (userId) ids.add(userId);
    }
    const users = await Promise.all([...ids].map((id) => getUser(client, id).catch(() => null)));
    for (const user of users) if (user) names[user.id] = user.full_name || "Unnamed";
  }
  return { history, names, cities };
}

/** Whether admin_send_notification would pick this account for the segment. */
export function matchesSegment(
  user: Pick<AdminUserRow, "id" | "platform_role" | "account_status">,
  segment: Segment,
  trainerIdsInCity: ReadonlySet<string> | null,
): boolean {
  if (user.account_status !== "active") return false;
  switch (segment.audience) {
    case "all":
      return user.platform_role !== null;
    case "clients":
      return user.platform_role === "client";
    case "trainers":
      return user.platform_role === "trainer" && (trainerIdsInCity === null || trainerIdsInCity.has(user.id));
    case "user":
      return user.id === segment.user_id;
  }
}

/**
 * Counts who would receive the announcement with read-only queries, resolving the audience
 * the way admin_send_notification does. There is no count function on the server, so this
 * pages through admin_list_users and stops after ESTIMATE_MAX_PAGES pages with a floor.
 */
export async function estimateRecipients(
  client: AppSupabaseClient,
  access: SessionAccess,
  segment: Segment,
): Promise<RecipientEstimate> {
  if (!can(access.permissions, "users.read")) {
    return { kind: "unavailable", reason: missingPermissionMessage("users.read", "Counting recipients") };
  }
  if (segment.audience === "user") {
    const user = await getUser(client, segment.user_id).catch((error: unknown) => {
      if (toAppError(error).code === "BRNTF") return null;
      throw error;
    });
    return { kind: "exact", count: user && matchesSegment(user, segment, null) ? 1 : 0 };
  }

  let trainerIdsInCity: Set<string> | null = null;
  if (segment.audience === "trainers" && segment.city) {
    if (!can(access.permissions, "applications.read")) {
      return {
        kind: "unavailable",
        reason: missingPermissionMessage("applications.read", "Counting trainers in a city"),
      };
    }
    trainerIdsInCity = await listTrainerIdsInCity(client, segment.city);
    if (trainerIdsInCity.size === 0) return { kind: "exact", count: 0 };
  }

  let count = 0;
  let scanned = 0;
  for (let page = 0; page < ESTIMATE_MAX_PAGES; page += 1) {
    const rows = await listUsers(client, {
      query: "",
      limit: ESTIMATE_PAGE_SIZE,
      offset: page * ESTIMATE_PAGE_SIZE,
    });
    scanned += rows.length;
    for (const row of rows) if (matchesSegment(row, segment, trainerIdsInCity)) count += 1;
    if (rows.length < ESTIMATE_PAGE_SIZE) return { kind: "exact", count };
  }
  return { kind: "floor", count, scanned };
}

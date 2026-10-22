/*
 * Server-side loaders for the announcements page (announcements.send). Names of senders and
 * of a one-person audience need users.read; the recipient count is the server's
 * (admin_count_recipients), which needs only announcements.send.
 */
import { countRecipients, listAnnouncements } from "@/lib/db/announcements";
import { listActiveCatalogue } from "@/lib/db/catalogue";
import { getUser } from "@/lib/db/rbac";
import { getSettingValue } from "@/lib/db/settings";
import { can } from "@/lib/rbac/can";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { SessionAccess } from "@/types/access";
import type { AnnouncementRow } from "@/types/database";
import {
  ANNOUNCEMENT_HISTORY_LIMIT,
  type RecipientEstimate,
  type Segment,
} from "@/features/announcements/schemas";

export type CityChoice = { key: string; label: string };

/** Whether announcements also reach phones; the platform setting push.enabled decides. */
export type PushStatus = { ok: true; enabled: boolean } | { ok: false; error: string };

/**
 * The push dispatcher posts only when push.enabled is exactly true, so a missing row or any
 * other value means push is off.
 */
export function pushEnabledFromSetting(value: unknown): boolean {
  return value === true;
}

export type AnnouncementsPageResult = {
  history: { ok: true; rows: AnnouncementRow[] } | { ok: false; error: string };
  /** User id to display name, for senders and one-person audiences; empty without users.read. */
  names: Record<string, string>;
  cities: { ok: true; items: CityChoice[] } | { ok: false; error: string };
  push: PushStatus;
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
  const [history, cities, push] = await Promise.all([
    listAnnouncements(client, ANNOUNCEMENT_HISTORY_LIMIT).then(
      (rows) => ({ ok: true as const, rows }),
      (error: unknown) => ({ ok: false as const, error: toAppError(error).message }),
    ),
    listActiveCatalogue(client, "city").then(
      (rows) => ({ ok: true as const, items: rows.map((row) => ({ key: row.key, label: row.label })) }),
      (error: unknown) => ({ ok: false as const, error: toAppError(error).message }),
    ),
    getSettingValue(client, "push.enabled").then(
      (value): PushStatus => ({ ok: true, enabled: pushEnabledFromSetting(value) }),
      (error: unknown): PushStatus => ({ ok: false, error: toAppError(error).message }),
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
  return { history, names, cities, push };
}

/** The exact number of people the segment reaches now; read-only. */
export async function estimateRecipients(
  client: AppSupabaseClient,
  segment: Segment,
): Promise<RecipientEstimate> {
  return { count: await countRecipients(client, segment) };
}

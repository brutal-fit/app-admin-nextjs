/*
 * Server-side loader for the settings page (catalogue.manage). Every known key is listed,
 * set or not; who changed a setting last is named only with users.read.
 */
import { getUser } from "@/lib/db/rbac";
import { listSettings } from "@/lib/db/settings";
import { can } from "@/lib/rbac/can";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { SessionAccess } from "@/types/access";
import type { Json } from "@/types/database";
import { SETTING_DEFINITIONS, type SettingDefinition } from "@/features/settings/schemas";

export type SettingEntry = {
  definition: SettingDefinition;
  /** Null when the key has no row yet: the app uses its built-in default. */
  value: Json | null;
  description: string;
  /** When the row was seeded or last set; null without a row. */
  updatedAt: string | null;
  /** Null when no admin set it yet, or the session cannot read users. */
  updatedByName: string | null;
};

export type SettingsResult = { ok: true; entries: SettingEntry[] } | { ok: false; error: string };

export async function loadSettings(
  client: AppSupabaseClient,
  access: SessionAccess,
): Promise<SettingsResult> {
  try {
    const rows = await listSettings(client);
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const names = new Map<string, string>();
    if (can(access.permissions, "users.read")) {
      const ids = [...new Set(rows.flatMap((row) => (row.updated_by ? [row.updated_by] : [])))];
      const users = await Promise.all(
        ids.map((id) => getUser(client, id).catch(() => null)),
      );
      for (const user of users) if (user) names.set(user.id, user.full_name || "Unnamed");
    }
    return {
      ok: true,
      entries: SETTING_DEFINITIONS.map((definition) => {
        const row = byKey.get(definition.key);
        return {
          definition,
          value: row ? row.value : null,
          description: row?.description || definition.description,
          updatedAt: row?.updated_at ?? null,
          updatedByName: row?.updated_by ? (names.get(row.updated_by) ?? null) : null,
        };
      }),
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

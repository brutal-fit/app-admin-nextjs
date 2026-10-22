/*
 * The platform settings data layer: the only file in src/ that spells platform_settings and
 * admin_set_setting (20261019000600_adminops_catalogue_announcements.sql). Everyone reads the
 * rows; admin_set_setting (catalogue.manage, audited) checks the key and the value. A key
 * without a row has never been set and the app uses its built-in default.
 */
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { Json, PlatformSettingRow } from "@/types/database";

const TABLE = { settings: "platform_settings" } as const;
const RPC = { set: "admin_set_setting" } as const;

export async function listSettings(client: AppSupabaseClient): Promise<PlatformSettingRow[]> {
  const { data, error } = await client
    .from(TABLE.settings)
    .select("key, value, description, updated_at, updated_by")
    .order("key");
  if (error) throw toAppError(error);
  return data;
}

/** One setting's stored value, or null when the key has no row (or is hidden from the API). */
export async function getSettingValue(client: AppSupabaseClient, key: string): Promise<Json | null> {
  const { data, error } = await client
    .from(TABLE.settings)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? data.value : null;
}

/** BRVAL with the server's text on an unknown key or a value that fails the key's check. */
export async function setSetting(client: AppSupabaseClient, key: string, value: Json): Promise<void> {
  const { error } = await client.rpc(RPC.set, { p_key: key, p_value: value });
  if (error) throw toAppError(error);
}

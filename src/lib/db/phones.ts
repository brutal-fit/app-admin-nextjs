/*
 * The batch phone reader for list pages: admin_list_user_phones(p_user_ids)
 * (20261021171917_phone_admin_reads.sql), which needs users.read and refuses more than 200 ids
 * with BRVAL. The server masks every phone to its last four digits unless the caller holds
 * users.manage, so the panel shows what comes back and never unmasks. List readers keep their
 * signatures; the users list calls this once with the ids it shows. The user 360 carries the
 * full phone in admin_get_user_detail.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac/can";

const RPC = { batch: "admin_list_user_phones" } as const;

/** admin_list_user_phones answers at most this many ids per call. */
export const PHONE_BATCH_MAX = 200;

// Object keyed by user id; unknown ids are left out, a user without a phone maps to null.
export const userPhoneBatchSchema = z.record(z.string(), z.string().nullable());

/** Phones by user id as the server returned them (full or masked); null means no phone. */
export type UserPhoneMap = Record<string, string | null>;

function uniqueIds(ids: readonly (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && id !== ""))];
}

/** Phones for the given users, deduplicated and asked for in batches the function accepts. */
export async function listUserPhones(
  client: AppSupabaseClient,
  ids: readonly (string | null | undefined)[],
): Promise<UserPhoneMap> {
  const unique = uniqueIds(ids);
  if (unique.length === 0) return {};
  const batches: string[][] = [];
  for (let start = 0; start < unique.length; start += PHONE_BATCH_MAX) {
    batches.push(unique.slice(start, start + PHONE_BATCH_MAX));
  }
  const replies = await Promise.all(
    batches.map(async (batch) => {
      const { data, error } = await client.rpc(RPC.batch, { p_user_ids: batch });
      if (error) throw toAppError(error);
      const parsed = userPhoneBatchSchema.safeParse(data);
      if (!parsed.success) {
        throw new AppError("UNKNOWN", "The phones came back in a shape the panel does not know.");
      }
      return parsed.data;
    }),
  );
  return Object.assign({}, ...replies) as UserPhoneMap;
}

/**
 * The list-page variant: a session without users.read or a failed call gives an empty map, so
 * the list still renders and each row says its phone was not loaded.
 */
export async function listUserPhonesOrEmpty(
  client: AppSupabaseClient,
  permissions: readonly string[],
  ids: readonly (string | null | undefined)[],
): Promise<UserPhoneMap> {
  if (!can(permissions, "users.read")) return {};
  try {
    return await listUserPhones(client, ids);
  } catch {
    return {};
  }
}

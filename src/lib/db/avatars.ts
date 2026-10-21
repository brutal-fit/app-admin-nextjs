/*
 * The batch avatar reader for list pages: admin_user_avatars(p_user_ids)
 * (20261021104634_avatar_presets.sql), which needs users.read and refuses more than 200 ids
 * with BRVAL. List readers keep their signatures; pages call this once with the ids they
 * show and merge the result. Detail readers (user 360, booking, support case) carry the same
 * avatar_path and avatar_preset keys themselves.
 */
import { z } from "zod";
import { AppError, toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac/can";
import { toAvatarRef, type AvatarRef } from "@/lib/utils/avatar";

const RPC = { batch: "admin_user_avatars" } as const;

/** admin_user_avatars answers at most this many ids per call. */
export const AVATAR_BATCH_MAX = 200;

const text = z.string().nullable().optional();

/** The two keys every reader adds per person; both optional so older replies still parse. */
export const avatarKeysSchema = z.object({ avatar_path: text, avatar_preset: text });

// Object keyed by user id; unknown ids are left out by the server.
export const userAvatarBatchSchema = z.record(
  z.string(),
  avatarKeysSchema.extend({ full_name: text }),
);

/** Avatars by user id; a missing id renders as initials. */
export type UserAvatarMap = Record<string, AvatarRef>;

function uniqueIds(ids: readonly (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && id !== ""))];
}

/** Avatars for the given users, deduplicated and asked for in batches the function accepts. */
export async function listUserAvatars(
  client: AppSupabaseClient,
  ids: readonly (string | null | undefined)[],
): Promise<UserAvatarMap> {
  const unique = uniqueIds(ids);
  if (unique.length === 0) return {};
  const batches: string[][] = [];
  for (let start = 0; start < unique.length; start += AVATAR_BATCH_MAX) {
    batches.push(unique.slice(start, start + AVATAR_BATCH_MAX));
  }
  const replies = await Promise.all(
    batches.map(async (batch) => {
      const { data, error } = await client.rpc(RPC.batch, { p_user_ids: batch });
      if (error) throw toAppError(error);
      const parsed = userAvatarBatchSchema.safeParse(data);
      if (!parsed.success) {
        throw new AppError("UNKNOWN", "The avatars came back in a shape the panel does not know.");
      }
      return parsed.data;
    }),
  );
  const map: UserAvatarMap = {};
  for (const reply of replies) {
    for (const [id, value] of Object.entries(reply)) {
      map[id] = toAvatarRef(value.avatar_path, value.avatar_preset);
    }
  }
  return map;
}

/**
 * The list-page variant: avatars are decoration, so a session without users.read or a failed
 * call gives an empty map (initials) and never blocks the list.
 */
export async function listUserAvatarsOrEmpty(
  client: AppSupabaseClient,
  permissions: readonly string[],
  ids: readonly (string | null | undefined)[],
): Promise<UserAvatarMap> {
  if (!can(permissions, "users.read")) return {};
  try {
    return await listUserAvatars(client, ids);
  } catch {
    return {};
  }
}

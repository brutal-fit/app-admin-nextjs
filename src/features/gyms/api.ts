/*
 * Server-side loaders for the BRUTAL gym pages (gyms.read). Each returns a result the page
 * renders as is: rows or the gym, or the error in words.
 */
import { getAdminGym, listGyms, type AdminGymDetail } from "@/lib/db/gyms-admin";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { AdminGymListRow } from "@/types/database";
import { GYM_LIST_LIMIT, type GymListFilters } from "@/features/gyms/schemas";

export type GymListResult =
  | { ok: true; rows: AdminGymListRow[]; total: number }
  | { ok: false; error: string };

export async function loadGymList(client: AppSupabaseClient, filters: GymListFilters): Promise<GymListResult> {
  try {
    const { rows, total } = await listGyms(client, {
      status: filters.status === "all" ? null : filters.status,
      search: filters.q || null,
      limit: GYM_LIST_LIMIT,
      offset: 0,
    });
    return { ok: true, rows, total };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export type GymDetailResult = { ok: true; gym: AdminGymDetail } | { ok: false; error: string };

export async function loadGymDetail(client: AppSupabaseClient, gymId: string): Promise<GymDetailResult> {
  if (!/^[0-9a-f-]{36}$/i.test(gymId)) return { ok: false, error: "We could not find that gym." };
  try {
    return { ok: true, gym: await getAdminGym(client, gymId) };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

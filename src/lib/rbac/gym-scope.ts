import { cache } from "react";
import { listManagedGyms, type ManagedGymSummary } from "@/lib/db/gyms";
import { can } from "@/lib/rbac/can";
import { getSessionAccess } from "@/lib/rbac/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAppError } from "@/lib/supabase/errors";

export type GymScope =
  | { status: "none" }
  | { status: "ok"; gyms: ManagedGymSummary[] }
  | { status: "error"; message: string };

/**
 * The gyms the signed-in user manages now (active gym_staff manager rows), resolved once per
 * request. Only sessions holding the gym.self marker look; the gym functions check the same
 * rows again on every call. Server only: it reads the auth cookies.
 */
export const getGymScope = cache(async (): Promise<GymScope> => {
  const session = await getSessionAccess();
  if (session.status !== "ok" || !can(session.access.permissions, "gym.self")) {
    return { status: "none" };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const gyms = await listManagedGyms(supabase, session.access.userId);
    return gyms.length > 0 ? { status: "ok", gyms } : { status: "none" };
  } catch (error) {
    return { status: "error", message: toAppError(error).message };
  }
});

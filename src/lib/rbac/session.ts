import { cache } from "react";
import { getMyAccess } from "@/lib/db/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toAppError, type AppErrorPayload } from "@/lib/supabase/errors";
import type { SessionAccess } from "@/types/access";

export type SessionAccessResult =
  | { status: "anonymous" }
  | { status: "no-access" }
  | { status: "error"; error: AppErrorPayload }
  | { status: "ok"; access: SessionAccess };

/**
 * The signed-in user's access, resolved once per request (React cache) and shared by the
 * layout, pages, actions and route handlers. Server only: it reads the auth cookies.
 */
export const getSessionAccess = cache(async (): Promise<SessionAccessResult> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { status: "anonymous" };
    const access = await getMyAccess(supabase);
    if (access.permissions.length === 0) return { status: "no-access" };
    return { status: "ok", access };
  } catch (error) {
    return { status: "error", error: toAppError(error).toPayload() };
  }
});

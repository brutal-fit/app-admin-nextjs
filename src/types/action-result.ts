import type { AppErrorPayload } from "@/lib/supabase/errors";

/** The serialisable result every server action returns to the client. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: AppErrorPayload };

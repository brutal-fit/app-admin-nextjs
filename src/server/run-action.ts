import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { ForbiddenError, requirePermission } from "@/lib/rbac/require-permission";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { createSupabaseServerClient, type AppSupabaseClient } from "@/lib/supabase/server";
import { AppError, errorPayload } from "@/lib/supabase/errors";
import type { SessionAccess } from "@/types/access";
import type { ActionResult } from "@/types/action-result";

/**
 * The one path every server action takes: validate with Zod, check the permission, run the
 * data-layer call, and turn any failure into a serialisable error for a toast.
 */
export async function runAction<Schema extends z.ZodType, T>(
  schema: Schema,
  input: unknown,
  permission: PermissionKey,
  run: (
    data: z.output<Schema>,
    context: { supabase: AppSupabaseClient; access: SessionAccess },
  ) => Promise<T>,
): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "That input is not valid.";
    return { ok: false, error: new AppError("BRVAL", message).toPayload() };
  }
  try {
    const access = await requirePermission(permission);
    const supabase = await createSupabaseServerClient();
    const data = await run(parsed.data, { supabase, access });
    return { ok: true, data };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ForbiddenError) {
      return { ok: false, error: new AppError("BRPRM").toPayload() };
    }
    return { ok: false, error: errorPayload(error) };
  }
}

"use server";

import { redirect } from "next/navigation";
import { bindGymInvites } from "@/lib/db/gyms-manager";
import { getMyAccess } from "@/lib/db/rbac";
import { hasPanelAccess } from "@/lib/rbac/can";
import { homeHref } from "@/lib/rbac/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError, NO_ADMIN_ROLE_MESSAGE, errorPayload } from "@/lib/supabase/errors";
import { signInSchema } from "@/features/auth/schemas";
import type { ActionResult } from "@/types/action-result";

export type SignInState = ActionResult | null;

/**
 * Signs in with email and password, then asks the server what this account may do. Accounts
 * the server reports without admin access (clients, trainers), or whose admin roles grant no
 * permission, are signed straight back out.
 */
export async function signInAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the email and password.";
    return { ok: false, error: new AppError("BRVAL", message).toPayload() };
  }

  let home = "/dashboard";
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { ok: false, error: errorPayload(error) };

    // An account that existed before its gym invite joins the gym (and gets the gym manager
    // role) only through this call. Best effort: sign-in never fails on it.
    try {
      await bindGymInvites(supabase);
    } catch {
      // No invite to bind, or the gym schema is not installed; the access check decides.
    }

    let allowed: boolean;
    try {
      const access = await getMyAccess(supabase);
      allowed = hasPanelAccess(access);
      home = homeHref(access.permissions);
    } catch (accessError) {
      await supabase.auth.signOut();
      return { ok: false, error: errorPayload(accessError) };
    }
    if (!allowed) {
      await supabase.auth.signOut();
      return { ok: false, error: new AppError("BRPRM", NO_ADMIN_ROLE_MESSAGE).toPayload() };
    }
  } catch (error) {
    return { ok: false, error: errorPayload(error) };
  }

  redirect(home);
}

export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Signing out of a missing or broken session still ends at the login page.
  }
  redirect("/login");
}

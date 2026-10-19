"use server";

import { redirect } from "next/navigation";
import { getMyAccess } from "@/lib/db/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError, NO_ADMIN_ROLE_MESSAGE, errorPayload } from "@/lib/supabase/errors";
import { signInSchema } from "@/features/auth/schemas";
import type { ActionResult } from "@/types/action-result";

export type SignInState = ActionResult | null;

/**
 * Signs in with email and password, then asks the server what this account may do. Accounts
 * without an admin role (clients, trainers) are signed straight back out.
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

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { ok: false, error: errorPayload(error) };

    let permissions: string[];
    try {
      permissions = (await getMyAccess(supabase)).permissions;
    } catch (accessError) {
      await supabase.auth.signOut();
      return { ok: false, error: errorPayload(accessError) };
    }
    if (permissions.length === 0) {
      await supabase.auth.signOut();
      return { ok: false, error: new AppError("BRPRM", NO_ADMIN_ROLE_MESSAGE).toPayload() };
    }
  } catch (error) {
    return { ok: false, error: errorPayload(error) };
  }

  redirect("/dashboard");
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

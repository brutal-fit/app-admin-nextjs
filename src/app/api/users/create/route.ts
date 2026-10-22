import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createUserSchema } from "@/features/users/schemas";
import { assignRole } from "@/lib/db/rbac";
import { ForbiddenError, requirePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError, errorPayload, type AppErrorPayload } from "@/lib/supabase/errors";
import { createServiceClient, isServiceRoleConfigured } from "@/server/service-client";

function fail(status: number, error: AppErrorPayload) {
  return NextResponse.json({ ok: false, error }, { status });
}

// No look-alike characters, so a password read out or copied by hand survives.
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** A 16-character temporary password from the platform's secure random source. */
function temporaryPassword(): string {
  const bytes = randomBytes(16);
  let password = "";
  for (const byte of bytes) password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
  return password;
}

/**
 * Creates a confirmed auth account for a mobile number and assigns admin roles. Phone is the
 * identity: the person signs in to the app with a code texted to that number. With an email,
 * the account also gets a confirmed email and a temporary password for this panel (which signs
 * in with email and password), returned once in the response and never stored or logged; a
 * gym manager gets their panel login this way, and the gym invite for the phone binds on
 * sign-up. The account is created with the service role (Auth admin API), and the new-user
 * trigger copies the phone to the profile; roles are assigned with the caller's own session
 * so the database checks users.manage again.
 */
export async function POST(request: Request) {
  try {
    await requirePermission("users.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return fail(403, new AppError("BRPRM").toPayload());
    return fail(500, errorPayload(error));
  }

  if (!isServiceRoleConfigured()) {
    return fail(503, new AppError("SERVICE_ROLE_MISSING").toPayload());
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, new AppError("BRVAL", "The request body is not JSON.").toPayload());
  }
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "That input is not valid.";
    return fail(400, new AppError("BRVAL", message).toPayload());
  }
  const input = parsed.data;

  let userId: string;
  const password = input.email ? temporaryPassword() : null;
  try {
    const service = createServiceClient();
    const { data, error } = await service.auth.admin.createUser({
      phone: input.phone,
      phone_confirm: true,
      ...(input.email && password ? { email: input.email, email_confirm: true, password } : {}),
      user_metadata: { full_name: input.fullName },
    });
    if (error) return fail(error.status === 422 ? 400 : 500, errorPayload(error));
    userId = data.user.id;
  } catch (error) {
    return fail(500, errorPayload(error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    for (const roleId of input.roleIds) await assignRole(supabase, { userId, roleId });
  } catch (error) {
    const reason = errorPayload(error);
    // The account exists, so its one-time password still has to reach the admin.
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: reason.code,
          message: `The account was created, but assigning roles failed: ${reason.message}`,
        },
        temporaryPassword: password,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  // The temporary password leaves the server only in this response; no-store keeps it out of caches.
  return NextResponse.json(
    { ok: true, userId, temporaryPassword: password },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}

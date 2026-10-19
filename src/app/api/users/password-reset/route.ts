import { NextResponse } from "next/server";
import { passwordResetSchema } from "@/features/users/schemas";
import { notePasswordReset } from "@/lib/db/users";
import { ForbiddenError, requirePermission } from "@/lib/rbac/require-permission";
import { AppError, errorPayload, toAppError, type AppErrorPayload } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceRoleConfigured } from "@/server/service-client";

function fail(status: number, error: AppErrorPayload) {
  return NextResponse.json({ ok: false, error }, { status });
}

function statusFor(error: AppError): number {
  if (error.code === "BRNTF") return 404;
  if (error.code === "BRVAL") return 400;
  return 500;
}

/**
 * The audit row for a reset already sent. It runs with the caller's session, so the audit
 * names the admin; a failure here must not turn a sent email into an error, so it is only
 * written to the server console (code and message, never the address).
 */
async function noteReset(userId: string): Promise<void> {
  try {
    const client = await createSupabaseServerClient();
    await notePasswordReset(client, userId);
  } catch (error) {
    const appError = toAppError(error);
    console.error(`Password reset sent but not audited: ${appError.code} ${appError.message}`);
  }
}

/**
 * Sends the account's password reset email, then notes it in the audit log through
 * admin_note_password_reset. The email address is read with the service role (Auth admin
 * API) from the user id, so the client never chooses where the email goes. Neither the
 * address nor the Auth answer is logged.
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
  const parsed = passwordResetSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "That input is not valid.";
    return fail(400, new AppError("BRVAL", message).toPayload());
  }

  try {
    const service = createServiceClient();
    const found = await service.auth.admin.getUserById(parsed.data.userId);
    if (found.error) {
      const error = toAppError(found.error);
      return fail(statusFor(error), error.toPayload());
    }
    const email = found.data.user.email;
    if (!email) {
      return fail(400, new AppError("BRVAL", "This account has no email address.").toPayload());
    }
    const sent = await service.auth.resetPasswordForEmail(email);
    if (sent.error) {
      const error = toAppError(sent.error);
      return fail(error.code === "BRVAL" ? 429 : statusFor(error), error.toPayload());
    }
  } catch (error) {
    return fail(500, errorPayload(error));
  }

  await noteReset(parsed.data.userId);
  return NextResponse.json({ ok: true, sent: true }, { status: 200 });
}

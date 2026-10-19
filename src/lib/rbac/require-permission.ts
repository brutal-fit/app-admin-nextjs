import { redirect } from "next/navigation";
import { can } from "@/lib/rbac/can";
import { routePermission, type PermissionKey } from "@/lib/rbac/permissions";
import { getSessionAccess } from "@/lib/rbac/session";
import { AppError } from "@/lib/supabase/errors";
import type { SessionAccess } from "@/types/access";

export class ForbiddenError extends Error {
  readonly permission: PermissionKey | null;

  constructor(permission: PermissionKey | null) {
    super(permission ? `Missing permission ${permission}.` : "No admin access.");
    this.name = "ForbiddenError";
    this.permission = permission;
  }
}

/**
 * Server-side gate for actions and route handlers. Throws ForbiddenError unless the session
 * holds the key; the database checks the same key again inside the function it calls.
 */
export async function requirePermission(key: PermissionKey): Promise<SessionAccess> {
  const session = await getSessionAccess();
  if (session.status !== "ok") throw new ForbiddenError(key);
  if (!can(session.access.permissions, key)) throw new ForbiddenError(key);
  return session.access;
}

/**
 * Gate for pages. Layouts do not re-render on client navigation, so every page calls this
 * with its own route pattern in addition to the layout check.
 */
export async function requireRoutePermission(pattern: string): Promise<SessionAccess> {
  const session = await getSessionAccess();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "no-access") redirect("/login?reason=no-access");
  // The layout renders this state itself; reaching here means a page rendered without it.
  if (session.status === "error") throw new AppError(session.error.code, session.error.message);
  const rule = routePermission(pattern);
  if (!rule) redirect("/forbidden");
  if (rule.kind === "permission" && !can(session.access.permissions, rule.key)) {
    redirect("/forbidden");
  }
  return session.access;
}

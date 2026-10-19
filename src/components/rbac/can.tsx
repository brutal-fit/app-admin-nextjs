"use client";

import type { ReactNode } from "react";
import { can } from "@/lib/rbac/can";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { useSessionStore } from "@/stores/session-store-provider";

/**
 * Renders children only when the session holds the permission. This hides UI; the server
 * action or route behind it checks the permission again.
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const allowed = useSessionStore((state) => can(state.access?.permissions, permission));
  return <>{allowed ? children : fallback}</>;
}

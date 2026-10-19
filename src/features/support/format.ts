import { can } from "@/lib/rbac/can";
import { routePermission } from "@/lib/rbac/permissions";
import type { SupportCaseStatus, SupportPriority } from "@/types/database";

/** Badge classes for a case status (outline badges, see docs/architecture.md). */
export function supportStatusTone(status: SupportCaseStatus): string {
  switch (status) {
    case "escalated":
      return "border-destructive text-destructive";
    case "open":
    case "triaged":
    case "investigating":
    case "waiting_for_user":
      return "border-warning text-warning";
    case "resolved":
      return "border-success text-success";
    default:
      return "text-muted-foreground";
  }
}

/** Badge classes for a priority: safety reads as an alarm, normal stays quiet. */
export function supportPriorityTone(priority: SupportPriority): string {
  if (priority === "safety") return "border-destructive bg-destructive/15 text-destructive";
  if (priority === "high") return "border-warning text-warning";
  return "text-muted-foreground";
}

/** A short excerpt for target cards; the full text stays on the screen it belongs to. */
export function excerpt(value: string | null | undefined, max = 160): string {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

/**
 * The href when the session may open it, else null. A page the registry does not know yet
 * (bookings, before its package lands) is null too, so a case never links to a dead route.
 */
export function permittedHref(permissions: readonly string[], href: string): string | null {
  const rule = routePermission(href);
  if (!rule) return null;
  return rule.kind === "open" || can(permissions, rule.key) ? href : null;
}

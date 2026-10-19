/*
 * Pure helpers for the user 360: labels, tones, why an action is unavailable, and how an audit
 * entry about this user reads. No data access, so the wording is testable with plain values.
 */
import { PERMISSIONS, type PermissionKey } from "@/lib/rbac/permissions";
import type { UserAuditEntry } from "@/lib/db/users";
import type { AccountStatus, BookingStatus, Json, PrivacyRequestKind } from "@/types/database";

/** Booking statuses in the order a booking moves through them, end states last. */
export const BOOKING_STATUS_ORDER = [
  "requested",
  "pending_confirmation",
  "confirmed",
  "reschedule_requested",
  "completed",
  "cancelled",
  "no_show",
  "disputed",
] as const satisfies readonly BookingStatus[];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  requested: "Requested",
  pending_confirmation: "Pending confirmation",
  confirmed: "Confirmed",
  reschedule_requested: "Reschedule requested",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  disputed: "Disputed",
};

export const PRIVACY_KIND_LABELS: Record<PrivacyRequestKind, string> = {
  data_export: "Data export",
  account_deletion: "Account deletion",
};

/** Requests in these states are done; anything else still waits for processing. */
export const PRIVACY_FINAL_STATUSES: readonly string[] = ["completed", "rejected"];

export function accountStatusTone(status: AccountStatus): string {
  return status === "active" ? "border-success text-success" : "border-destructive text-destructive";
}

export function privacyStatusTone(status: string): string {
  if (status === "completed") return "border-success text-success";
  if (status === "rejected") return "text-muted-foreground";
  return "border-warning text-warning";
}

export function privacyStatusLabel(status: string): string {
  if (status === "received") return "Waiting";
  if (status === "completed") return "Completed";
  if (status === "rejected") return "Rejected";
  return status.replaceAll("_", " ");
}

/** Why a part of the page is missing, naming the permission and its key. */
export function missingPermissionMessage(key: PermissionKey, what: string): string {
  const name = PERMISSIONS.find((permission) => permission.key === key)?.name ?? key;
  return `${what} needs the ${name} permission (${key}).`;
}

/**
 * Why suspending this account is refused, or null when the server would allow it. Mirrors the
 * checks in admin_set_account_status so the button says so before the call fails.
 */
export function suspendBlockedReason(input: {
  targetId: string;
  sessionUserId: string;
  targetRoleKeys: readonly string[];
}): string | null {
  if (input.targetId === input.sessionUserId) return "You cannot suspend your own account.";
  if (input.targetRoleKeys.includes("super_admin")) return "A super admin cannot be suspended.";
  return null;
}

function detail(details: Json | null | undefined, key: string): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const value = details[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** "<actor> <what>" for one audit entry whose target is this user. Unknown actions still show. */
export function describeUserAuditEntry(entry: UserAuditEntry): string {
  const details = entry.details ?? null;
  const role = detail(details, "role");
  switch (entry.action) {
    case "account.status": {
      const to = detail(details, "to");
      const reason = detail(details, "reason");
      const verb = to === "suspended" ? "suspended the account" : "reinstated the account";
      return reason ? `${verb}: ${reason}` : verb;
    }
    case "privacy.process": {
      const kind = detail(details, "kind");
      const outcome = detail(details, "outcome") ?? "processed";
      const label =
        kind === "data_export" || kind === "account_deletion"
          ? PRIVACY_KIND_LABELS[kind].toLowerCase()
          : "privacy";
      return `marked the ${label} request ${outcome}`;
    }
    case "assign_role":
      return `granted ${role ?? "a role"}`;
    case "revoke_role":
      return `revoked ${role ?? "a role"}`;
    case "set_platform_role":
      return `gave ${role ? `${role} app access` : "app access"}`;
    default:
      return entry.action.replace(/[._]/g, " ");
  }
}

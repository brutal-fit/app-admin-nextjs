/*
 * Pure helpers for the dashboard: how an audit entry reads in the activity feed. No data
 * access here, so the wording is testable with plain rows.
 */
import { APPLICATION_STATUS_LABELS } from "@/features/applications/schemas";
import type { ApplicationStatus, AuditLogRow, Json } from "@/types/database";

export type ActivityTarget = { label: string; href: string | null };

export type ActivityDescription = {
  /** What the actor did, written to read after their name. */
  verb: string;
  target: ActivityTarget | null;
};

/** Names and links the loader could resolve, and which links the session may follow. */
export type ActivityContext = {
  userNames: ReadonlyMap<string, string>;
  applicantNames: ReadonlyMap<string, string>;
  canOpenRoles: boolean;
  canOpenUsers: boolean;
  canOpenApplications: boolean;
};

function detail(details: Json, key: string): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const value = details[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function statusLabel(value: string | null): string {
  return value && value in APPLICATION_STATUS_LABELS
    ? APPLICATION_STATUS_LABELS[value as ApplicationStatus]
    : (value ?? "a new status");
}

/**
 * Turns one admin_list_audit row into "<verb> <target>". Unknown actions still show, with
 * the raw action name, so a new server action never disappears from the feed.
 */
export function describeAuditEntry(row: AuditLogRow, context: ActivityContext): ActivityDescription {
  const id = row.target_id;
  const roleTarget = (fallback: string): ActivityTarget => ({
    label: detail(row.details, "name") ?? detail(row.details, "key") ?? fallback,
    href: id && context.canOpenRoles ? `/roles/${id}` : null,
  });
  const userTarget = (): ActivityTarget => ({
    label: (id && context.userNames.get(id)) || "a user",
    href: id && context.canOpenUsers ? `/users/${id}` : null,
  });
  const role = detail(row.details, "role");

  switch (row.action) {
    case "create_role":
      return { verb: "created the role", target: roleTarget("a role") };
    case "update_role":
      return { verb: "updated the role", target: roleTarget("a role") };
    case "set_role_permissions":
      return { verb: "changed the permissions of", target: roleTarget("a role") };
    case "delete_role":
      return {
        verb: "deleted the role",
        target: { label: detail(row.details, "name") ?? detail(row.details, "key") ?? "a role", href: null },
      };
    case "assign_role":
      return { verb: `granted ${role ?? "a role"} to`, target: userTarget() };
    case "revoke_role":
      return { verb: `revoked ${role ?? "a role"} from`, target: userTarget() };
    case "set_platform_role":
      return { verb: `gave ${role ? `${role} app access` : "app access"} to`, target: userTarget() };
    case "review_application":
      return {
        verb: `moved to ${statusLabel(detail(row.details, "status"))}:`,
        target: {
          label: (id && context.applicantNames.get(id)) || "an application",
          href: id && context.canOpenApplications ? `/applications/${id}` : null,
        },
      };
    default:
      return { verb: row.action.replaceAll("_", " "), target: null };
  }
}

/** Audit actions whose target is a user (names come from admin_get_user). */
export const USER_TARGET_ACTIONS = new Set(["assign_role", "revoke_role", "set_platform_role"]);
/** Audit actions whose target is a trainer application. */
export const APPLICATION_TARGET_ACTIONS = new Set(["review_application"]);

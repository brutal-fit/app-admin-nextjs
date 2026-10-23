/*
 * Pure helpers for the audit page and its export: where a row's target links, how its
 * detail reads, and how a row becomes a CSV line. No data access, so each is testable.
 */
import { permittedHref } from "@/features/support/format";
import type { AuditLogRow, Json } from "@/types/database";

export type AuditTargetKind =
  | "user"
  | "role"
  | "application"
  | "trainer"
  | "case"
  | "booking"
  | "review"
  | "catalogue"
  | "setting"
  | "announcement"
  | "gym";

const TARGET_KIND: Readonly<Record<string, AuditTargetKind>> = {
  create_role: "role",
  update_role: "role",
  delete_role: "role",
  set_role_permissions: "role",
  assign_role: "user",
  revoke_role: "user",
  set_platform_role: "user",
  "account.status": "user",
  "privacy.process": "user",
  review_application: "application",
  "trainer.update": "trainer",
  "trainer.services": "trainer",
  "trainer.request_documents": "trainer",
  "support.update": "case",
  "booking.cancel": "booking",
  "booking.dispute": "booking",
  "review.moderate": "review",
  "catalogue.upsert": "catalogue",
  "catalogue.delete": "catalogue",
  "setting.update": "setting",
  "announcement.send": "announcement",
  "gym.create": "gym",
  "gym.verify": "gym",
  "gym.listed": "gym",
  "gym.service_price": "gym",
  // A gym manager's booking actions target the booking; the gym is in the detail.
  "gym.allot": "booking",
  "gym.decline": "booking",
  "gym.reassign": "booking",
};

const KIND_LABELS: Record<AuditTargetKind, string> = {
  user: "User",
  role: "Role",
  application: "Application",
  trainer: "Trainer",
  case: "Support case",
  booking: "Booking",
  review: "Review",
  catalogue: "Catalogue item",
  setting: "Setting",
  announcement: "Announcement",
  gym: "Gym",
};

export type AuditTarget = {
  kind: AuditTargetKind | null;
  label: string;
  /** Null when there is no page for it or the session may not open that page. */
  href: string | null;
};

function detailText(details: Json, key: string): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const value = details[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function hrefFor(row: AuditLogRow, kind: AuditTargetKind): string | null {
  const id = row.target_id ? encodeURIComponent(row.target_id) : null;
  switch (kind) {
    case "user":
      return id ? `/users/${id}` : null;
    case "role":
      return id && row.action !== "delete_role" ? `/roles/${id}` : null;
    case "application":
      return id ? `/applications/${id}` : null;
    case "trainer":
      return id ? `/trainers/${id}` : null;
    case "case":
      return id ? `/support/${id}` : null;
    case "booking":
      return id ? `/bookings/${id}` : null;
    case "review": {
      // There is no page per review; the trainer's reviews list holds it.
      const trainer = detailText(row.details, "trainer_id");
      return trainer ? `/reviews?trainer=${encodeURIComponent(trainer)}` : null;
    }
    case "catalogue": {
      const catalogueKind = detailText(row.details, "kind");
      return row.action === "catalogue.upsert" && catalogueKind
        ? `/catalogue?kind=${encodeURIComponent(catalogueKind)}`
        : null;
    }
    case "setting":
      return "/settings";
    case "announcement":
      return "/announcements";
    case "gym":
      return id ? `/gyms/${id}` : null;
  }
}

function labelFor(row: AuditLogRow, kind: AuditTargetKind): string {
  const base = KIND_LABELS[kind];
  switch (kind) {
    case "role": {
      const name = detailText(row.details, "name") ?? detailText(row.details, "key");
      return name ? `${base} ${name}` : base;
    }
    case "catalogue": {
      const key = detailText(row.details, "key");
      return key ? `${base} ${key}` : base;
    }
    case "setting": {
      const key = detailText(row.details, "key");
      return key ? `${base} ${key}` : base;
    }
    case "announcement": {
      const title = detailText(row.details, "title");
      return title ? `${base}: ${title}` : base;
    }
    case "gym": {
      // Only gym.create stores the name; the other gym actions fall back to the short id.
      const name = detailText(row.details, "name");
      if (name) return `${base} ${name}`;
      return row.target_id ? `${base} ${shortId(row.target_id)}` : base;
    }
    default:
      return row.target_id ? `${base} ${shortId(row.target_id)}` : base;
  }
}

/**
 * What a row acted on, linked to the page for it when one exists and the session holds
 * that page's permission. Unknown actions show the bare target id, unlinked.
 */
export function auditTarget(row: AuditLogRow, permissions: readonly string[]): AuditTarget | null {
  const kind = TARGET_KIND[row.action] ?? null;
  if (!kind) {
    return row.target_id ? { kind: null, label: shortId(row.target_id), href: null } : null;
  }
  const href = hrefFor(row, kind);
  return { kind, label: labelFor(row, kind), href: href ? permittedHref(permissions, href) : null };
}

/** The detail jsonb, indented for reading. */
export function formatAuditDetails(details: Json): string {
  return JSON.stringify(details ?? {}, null, 2);
}

/** True when the detail holds something worth expanding. */
export function hasAuditDetails(details: Json): boolean {
  if (details === null || details === undefined) return false;
  if (typeof details === "object") return Object.keys(details).length > 0;
  return true;
}

// CSV --------------------------------------------------------------------------------------

export const AUDIT_CSV_COLUMNS = [
  "id",
  "created_at",
  "actor_id",
  "actor_name",
  "action",
  "target_id",
  "details",
] as const;

/**
 * One CSV cell: quoted when it holds a separator, quote or line break. A cell a spreadsheet
 * would run as a formula (starting =, +, -, @, tab or carriage return) gets a leading
 * apostrophe, since names and details are typed by people.
 */
export function csvCell(value: string | number | null): string {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function auditCsvHeader(): string {
  return `${AUDIT_CSV_COLUMNS.join(",")}\r\n`;
}

export function auditCsvRow(row: AuditLogRow): string {
  return `${[
    csvCell(row.id),
    csvCell(row.created_at),
    csvCell(row.actor_id),
    csvCell(row.actor_name),
    csvCell(row.action),
    csvCell(row.target_id),
    csvCell(JSON.stringify(row.details ?? {})),
  ].join(",")}\r\n`;
}

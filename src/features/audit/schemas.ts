/*
 * The audit page's filters, as they live in the URL (actor, action, target, from, to, q,
 * page), and the action names the backend writes. Pure, so the round trip is testable.
 */
import { z } from "zod";
import { isIsoDate } from "@/lib/utils/time";
import type { Json } from "@/types/database";

/** Rows per page; the function's total_count says whether more pages exist. */
export const AUDIT_PAGE_SIZE = 50;
/** The CSV export streams at most this many rows, newest first. */
export const AUDIT_EXPORT_MAX = 50000;
/** admin_list_audit refuses longer search text. */
export const AUDIT_SEARCH_MAX = 200;

/**
 * Every action the backend writes to private.admin_audit_log (migrations up to
 * 20261019000700, plus the gym actions of 20261022035524_gyms.sql), in the order the filter
 * lists them. The action filter is an exact match.
 */
export const AUDIT_ACTIONS = [
  "create_role",
  "update_role",
  "delete_role",
  "set_role_permissions",
  "assign_role",
  "revoke_role",
  "set_platform_role",
  "account.status",
  "privacy.process",
  "review_application",
  "trainer.update",
  "trainer.services",
  "trainer.request_documents",
  "support.update",
  "booking.cancel",
  "booking.dispute",
  "review.moderate",
  "catalogue.upsert",
  "catalogue.delete",
  "setting.update",
  "announcement.send",
  "gym.create",
  "gym.verify",
  "gym.listed",
  "gym.service_price",
  "gym.allot",
  "gym.decline",
  "gym.reassign",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create_role: "Role created",
  update_role: "Role updated",
  delete_role: "Role deleted",
  set_role_permissions: "Role permissions changed",
  assign_role: "Role granted",
  revoke_role: "Role revoked",
  set_platform_role: "App access granted",
  "account.status": "Account status changed",
  "privacy.process": "Privacy request processed",
  review_application: "Application decision",
  "trainer.update": "Trainer profile edited",
  "trainer.services": "Trainer services and prices set",
  "trainer.request_documents": "Documents requested",
  "support.update": "Support case updated",
  "booking.cancel": "Booking cancelled",
  "booking.dispute": "Dispute resolved",
  "review.moderate": "Review hidden or restored",
  "catalogue.upsert": "Catalogue item saved",
  "catalogue.delete": "Catalogue item deleted",
  "setting.update": "Setting changed",
  "announcement.send": "Announcement sent",
  "gym.create": "Gym created",
  "gym.verify": "Gym status changed",
  "gym.listed": "Gym listing changed",
  "gym.service_price": "Gym service price set",
  "gym.allot": "Gym trainer allotted",
  "gym.decline": "Gym booking declined",
  "gym.reassign": "Gym trainer reassigned",
};

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

/** The label for an action; an action the panel does not know yet shows as written. */
export function auditActionLabel(action: string): string {
  return isAuditAction(action) ? AUDIT_ACTION_LABELS[action] : action;
}

function detailObject(details: Json | null | undefined): Record<string, Json | undefined> | null {
  return details && typeof details === "object" && !Array.isArray(details) ? details : null;
}

const GYM_DECISION_LABELS: Readonly<Record<string, string>> = {
  verified: "Gym verified",
  rejected: "Gym rejected",
  suspended: "Gym suspended",
};

/**
 * The label for one logged row. Some actions carry what happened in their detail rather than
 * their name: admin_update_trainer logs a listing toggle as trainer.update with keys
 * ["published"], admin_set_gym_listed logs gym.listed with { listed }, and admin_verify_gym
 * logs gym.verify with { decision }. Those read as the change itself; anything else falls
 * back to the action's label.
 */
export function auditRowLabel(row: { action: string; details: Json | null | undefined }): string {
  const details = detailObject(row.details);
  if (row.action === "trainer.update" && details) {
    const keys = details.keys;
    const to = detailObject(details.to);
    if (Array.isArray(keys) && keys.length === 1 && keys[0] === "published" && to) {
      if (to.published === true) return "Trainer listed";
      if (to.published === false) return "Trainer unlisted";
    }
  }
  if (row.action === "gym.listed" && details) {
    if (details.listed === true) return "Gym listed";
    if (details.listed === false) return "Gym unlisted";
  }
  if (row.action === "gym.verify" && details && typeof details.decision === "string") {
    const label = GYM_DECISION_LABELS[details.decision];
    if (label) return label;
  }
  return auditActionLabel(row.action);
}

export type AuditFilters = {
  actorId: string | null;
  action: string | null;
  targetId: string | null;
  /** India dates "YYYY-MM-DD", both ends included. */
  from: string | null;
  to: string | null;
  search: string;
  page: number;
};

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  actorId: null,
  action: null,
  targetId: null,
  from: null,
  to: null,
  search: "",
  page: 1,
};

type SearchParams = Record<string, string | string[] | undefined>;

// guid, not uuid: the seed uses fixed ids without RFC version bits.
const uuid = z.guid();
const ACTION_PATTERN = /^[a-z_]+(\.[a-z_]+)?$/;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function isUuid(value: string): boolean {
  return uuid.safeParse(value).success;
}

function guidOrNull(raw: string | undefined): string | null {
  return raw && isUuid(raw) ? raw : null;
}

function dateOrNull(raw: string | undefined): string | null {
  return raw && isIsoDate(raw) ? raw : null;
}

/**
 * Reads the filters from the URL. Any action name of the backend's shape is kept, so an
 * action the panel does not list yet can still be filtered by link.
 */
export function parseAuditFilters(params: SearchParams): AuditFilters {
  const page = Number(first(params.page));
  const action = first(params.action)?.trim() ?? "";
  return {
    actorId: guidOrNull(first(params.actor)),
    action: ACTION_PATTERN.test(action) ? action : null,
    targetId: guidOrNull(first(params.target)),
    from: dateOrNull(first(params.from)),
    to: dateOrNull(first(params.to)),
    search: (first(params.q) ?? "").trim().slice(0, AUDIT_SEARCH_MAX),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

function filterParams(filters: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.actorId) params.set("actor", filters.actorId);
  if (filters.action) params.set("action", filters.action);
  if (filters.targetId) params.set("target", filters.targetId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.search) params.set("q", filters.search);
  return params;
}

/**
 * The page URL for a set of filters. Changing any filter starts again at page 1 unless the
 * page is given, so a narrowed list never opens on an empty later page.
 */
export function auditListHref(current: AuditFilters, change: Partial<AuditFilters> = {}): string {
  const next: AuditFilters = { ...current, page: 1, ...change };
  const params = filterParams(next);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/audit?${query}` : "/audit";
}

/** The export route for the same filters (the page number does not apply). */
export function auditExportHref(filters: AuditFilters): string {
  const query = filterParams(filters).toString();
  return query ? `/api/audit/export?${query}` : "/api/audit/export";
}

export function hasAuditFilters(filters: AuditFilters): boolean {
  return Boolean(
    filters.actorId || filters.action || filters.targetId || filters.from || filters.to || filters.search,
  );
}

/** A range whose end comes before its start; the server would refuse it. */
export function invalidAuditRange(filters: Pick<AuditFilters, "from" | "to">): boolean {
  return filters.from !== null && filters.to !== null && filters.to < filters.from;
}

/** `audit-<from>-<to>.csv`; an open start reads "start", an open end is today in India. */
export function auditExportFileName(filters: Pick<AuditFilters, "from" | "to">, today: string): string {
  return `audit-${filters.from ?? "start"}-${filters.to ?? today}.csv`;
}

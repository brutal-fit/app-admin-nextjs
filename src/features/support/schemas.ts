import { z } from "zod";
import type { ReportCategory, SupportCaseStatus, SupportPriority } from "@/types/database";

/** Rows per queue page; the queue asks for one more to know whether a next page exists. */
export const SUPPORT_PAGE_SIZE = 50;

/** Notes and replies stop where admin_update_support_case stops (2000 characters). */
export const SUPPORT_TEXT_MAX = 2000;

const SEARCH_MAX = 100;

/** Queue chip order: the working order of a case, then the two end states. */
export const SUPPORT_STATUSES = [
  "open",
  "triaged",
  "waiting_for_user",
  "investigating",
  "escalated",
  "resolved",
  "closed",
] as const satisfies readonly SupportCaseStatus[];

export const SUPPORT_CATEGORIES = [
  "safety",
  "person",
  "booking",
  "message",
  "review",
  "other",
] as const satisfies readonly ReportCategory[];

export const SUPPORT_STATUS_LABELS: Record<SupportCaseStatus, string> = {
  open: "Open",
  triaged: "Triaged",
  waiting_for_user: "Waiting for user",
  investigating: "Investigating",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
};

export const SUPPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  person: "Person",
  booking: "Booking",
  message: "Message",
  review: "Review",
  safety: "Safety",
  other: "Other",
};

export const SUPPORT_PRIORITY_LABELS: Record<SupportPriority, string> = {
  safety: "Safety",
  high: "High",
  normal: "Normal",
};

const caseId = z.guid("Unknown support case.");
export const supportCaseIdSchema = caseId;

/** Queue filters as they live in the URL; anything unknown is dropped, not an error. */
export type SupportFilters = {
  status: SupportCaseStatus | null;
  category: ReportCategory | null;
  assigneeId: string | null;
  search: string;
  page: number;
};

export const EMPTY_SUPPORT_FILTERS: SupportFilters = {
  status: null,
  category: null,
  assigneeId: null,
  search: "",
  page: 1,
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(values: readonly T[], raw: string | undefined): T | null {
  return raw !== undefined && (values as readonly string[]).includes(raw) ? (raw as T) : null;
}

export function parseSupportFilters(params: SearchParams): SupportFilters {
  const assignee = first(params.assignee);
  const page = Number(first(params.page));
  return {
    status: oneOf(SUPPORT_STATUSES, first(params.status)),
    category: oneOf(SUPPORT_CATEGORIES, first(params.category)),
    assigneeId: assignee && caseId.safeParse(assignee).success ? assignee : null,
    search: (first(params.q) ?? "").trim().slice(0, SEARCH_MAX),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/**
 * The queue URL for a set of filters. Changing any filter starts again at page 1 unless the
 * page is given, so a narrowed list never opens on an empty later page.
 */
export function supportListHref(
  current: SupportFilters,
  change: Partial<SupportFilters> = {},
): string {
  const next: SupportFilters = { ...current, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.category) params.set("category", next.category);
  if (next.assigneeId) params.set("assignee", next.assigneeId);
  if (next.search) params.set("q", next.search);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/support?${query}` : "/support";
}

export function hasSupportFilters(filters: SupportFilters): boolean {
  return Boolean(filters.status || filters.category || filters.assigneeId || filters.search);
}

// Server action inputs. Each action changes one thing, as the action bar sends it.

export const changeSupportStatusSchema = z.object({
  caseId,
  status: z.enum(SUPPORT_STATUSES, { error: "Choose a status." }),
});

/** A null assignee clears the assignment. */
export const assignSupportCaseSchema = z.object({
  caseId,
  assigneeId: z.guid("Choose a team member.").nullable(),
});

const body = (empty: string) =>
  z
    .string()
    .trim()
    .min(1, empty)
    .max(SUPPORT_TEXT_MAX, `Keep it under ${SUPPORT_TEXT_MAX} characters.`);

export const supportNoteSchema = z.object({ caseId, body: body("Write the note first.") });

export const supportReplySchema = z.object({ caseId, body: body("Write the reply first.") });

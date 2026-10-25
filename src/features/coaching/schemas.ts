import { z } from "zod";
import { COACHING_STATUS_VALUES } from "@/lib/db/coaching";
import { closeReasonSchema, guidOrNull } from "@/features/subscriptions/schemas";
import type { CoachingCancelledBy, CoachingStatus, CustomPlanStatus } from "@/types/database";

/** Rows per list page; the list asks for one more to know whether a next page exists. */
export const COACHING_PAGE_SIZE = 50;

export const COACHING_STATUSES = COACHING_STATUS_VALUES;

export const COACHING_STATUS_LABELS: Record<CoachingStatus, string> = {
  requested: "Requested",
  active: "Active",
  cancelled: "Ended",
  expired: "Expired",
};

export const COACHING_CANCELLED_BY_LABELS: Record<CoachingCancelledBy, string> = {
  client: "the client",
  coach: "the coach",
  admin: "BRUTAL",
};

export const CUSTOM_PLAN_STATUS_LABELS: Record<CustomPlanStatus, string> = {
  draft: "Draft",
  active: "Active",
  ended: "Ended",
};

/** end_coaching refuses anything else: "This coaching has already ended." */
export function isCoachingEndable(status: CoachingStatus): boolean {
  return status === "requested" || status === "active";
}

export type CoachingFilters = {
  status: CoachingStatus | null;
  coachId: string | null;
  page: number;
};

export const EMPTY_COACHING_FILTERS: CoachingFilters = { status: null, coachId: null, page: 1 };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCoachingFilters(params: SearchParams): CoachingFilters {
  const status = first(params.status);
  const page = Number(first(params.page));
  return {
    status: status && (COACHING_STATUSES as readonly string[]).includes(status) ? (status as CoachingStatus) : null,
    coachId: guidOrNull(first(params.coach)),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function coachingListHref(current: CoachingFilters, change: Partial<CoachingFilters> = {}): string {
  const next: CoachingFilters = { ...current, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.coachId) params.set("coach", next.coachId);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/coaching?${query}` : "/coaching";
}

export function hasCoachingFilters(filters: CoachingFilters): boolean {
  return Boolean(filters.status || filters.coachId);
}

export const coachingIdSchema = z.guid("Unknown coaching.");

// Server action input.
export const endCoachingSchema = z.object({
  id: coachingIdSchema,
  reason: closeReasonSchema,
});
export type EndCoachingInput = z.infer<typeof endCoachingSchema>;

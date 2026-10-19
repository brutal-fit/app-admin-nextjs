import { z } from "zod";

/** Rows per page of the unreported list; it asks for one more to know whether a next exists. */
export const REVIEW_PAGE_SIZE = 50;

/** admin_moderate_review stops at 500 characters. */
export const MODERATION_REASON_MAX = 500;

const uuid = z.guid("Unknown review.");

export const YES_NO = ["yes", "no"] as const;
export type YesNo = (typeof YES_NO)[number];

/** List filters as they live in the URL; anything unknown is dropped, not an error. */
export type ReviewFilters = {
  /** yes: hidden only; no: shown only. */
  hidden: YesNo | null;
  /** yes: reported only; no: unreported only; null: reported first, then the rest. */
  reported: YesNo | null;
  trainerId: string | null;
  page: number;
};

export const EMPTY_REVIEW_FILTERS: ReviewFilters = {
  hidden: null,
  reported: null,
  trainerId: null,
  page: 1,
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function yesNo(raw: string | undefined): YesNo | null {
  return raw === "yes" || raw === "no" ? raw : null;
}

export function parseReviewFilters(params: SearchParams): ReviewFilters {
  const trainer = first(params.trainer);
  const page = Number(first(params.page));
  return {
    hidden: yesNo(first(params.hidden)),
    reported: yesNo(first(params.reported)),
    trainerId: trainer && uuid.safeParse(trainer).success ? trainer : null,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function reviewListHref(current: ReviewFilters, change: Partial<ReviewFilters> = {}): string {
  const next: ReviewFilters = { ...current, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.reported) params.set("reported", next.reported);
  if (next.hidden) params.set("hidden", next.hidden);
  if (next.trainerId) params.set("trainer", next.trainerId);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/reviews?${query}` : "/reviews";
}

export function hasReviewFilters(filters: ReviewFilters): boolean {
  return Boolean(filters.hidden || filters.reported || filters.trainerId);
}

export function toBoolean(value: YesNo | null): boolean | null {
  return value === null ? null : value === "yes";
}

/** Hiding and restoring both need a reason; the server records it in the audit log. */
export const moderateReviewSchema = z.object({
  reviewId: uuid,
  hidden: z.boolean({ error: "Choose hide or restore." }),
  reason: z
    .string()
    .trim()
    .min(1, "Give a reason.")
    .max(MODERATION_REASON_MAX, `Keep the reason to ${MODERATION_REASON_MAX} characters or fewer.`),
});

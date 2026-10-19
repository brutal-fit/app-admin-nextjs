/*
 * The reviews data layer: the only file in src/ that spells the review admin functions.
 * admin_list_reviews and admin_moderate_review (20261019000500) check reviews.moderate. The
 * open reports on a review are support cases targeting it, read through RLS (support.read).
 * Every wrapper throws AppError on failure.
 */
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { AdminReviewListRow, SupportCaseStatus } from "@/types/database";

const TABLE = { supportCases: "support_cases" } as const;
const RPC = { list: "admin_list_reviews", moderate: "admin_moderate_review" } as const;

/** admin_list_reviews returns at most this many rows per call. */
export const REVIEW_LIST_MAX = 200;

const REVIEW_TARGET = "review";

// The same open set admin_list_reviews counts as a report (not resolved, not closed).
const OPEN_REPORT_STATUSES = [
  "open",
  "triaged",
  "waiting_for_user",
  "investigating",
  "escalated",
] as const satisfies readonly SupportCaseStatus[];

export type ReviewListRow = Omit<AdminReviewListRow, "open_reports"> & { open_reports: number };

export type ReviewQuery = {
  hidden: boolean | null;
  trainerId: string | null;
  reported: boolean | null;
  limit: number;
  offset: number;
};

/** Reviews newest first; `reported` true keeps only reviews with an open report. */
export async function listReviews(
  client: AppSupabaseClient,
  query: ReviewQuery,
): Promise<ReviewListRow[]> {
  const { data, error } = await client.rpc(RPC.list, {
    p_hidden: query.hidden,
    p_trainer: query.trainerId,
    p_reported: query.reported,
    p_limit: query.limit,
    p_offset: query.offset,
  });
  if (error) throw toAppError(error);
  // bigint may arrive as a string.
  return data.map((row) => ({ ...row, open_reports: Number(row.open_reports) }));
}

/** Reviews with an open report, up to the function's cap (a floor when `capped`). */
export async function countReportedReviews(
  client: AppSupabaseClient,
): Promise<{ count: number; capped: boolean }> {
  const rows = await listReviews(client, {
    hidden: null,
    trainerId: null,
    reported: true,
    limit: REVIEW_LIST_MAX,
    offset: 0,
  });
  return { count: rows.length, capped: rows.length >= REVIEW_LIST_MAX };
}

export type ReviewReportCase = { id: string; status: SupportCaseStatus };

/** Open support cases per review id, oldest first. */
export async function listOpenReportCases(
  client: AppSupabaseClient,
  reviewIds: readonly string[],
): Promise<Map<string, ReviewReportCase[]>> {
  if (reviewIds.length === 0) return new Map();
  const { data, error } = await client
    .from(TABLE.supportCases)
    .select("id, status, target_id")
    .eq("target_type", REVIEW_TARGET)
    .in("target_id", [...reviewIds])
    .in("status", [...OPEN_REPORT_STATUSES])
    .order("created_at");
  if (error) throw toAppError(error);
  const byReview = new Map<string, ReviewReportCase[]>();
  for (const row of data) {
    if (!row.target_id) continue;
    const list = byReview.get(row.target_id) ?? [];
    list.push({ id: row.id, status: row.status });
    byReview.set(row.target_id, list);
  }
  return byReview;
}

/** Hides (reason required) or restores a review; the listing rating follows on the server. */
export async function moderateReview(
  client: AppSupabaseClient,
  input: { reviewId: string; hidden: boolean; reason: string },
): Promise<void> {
  const { error } = await client.rpc(RPC.moderate, {
    p_id: input.reviewId,
    p_hidden: input.hidden,
    p_reason: input.reason,
  });
  if (error) throw toAppError(error);
}

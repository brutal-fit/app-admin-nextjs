/*
 * Server-side loader for the reviews page (reviews.moderate). Reported reviews (an open
 * support case targets them) come first as their own list; the rest follow, newest first,
 * 50 a page. Case links need support.read; without it the count still shows.
 */
import {
  REVIEW_LIST_MAX,
  listOpenReportCases,
  listReviews,
  type ReviewListRow,
  type ReviewReportCase,
} from "@/lib/db/reviews";
import { listUserAvatarsOrEmpty, type UserAvatarMap } from "@/lib/db/avatars";
import { can } from "@/lib/rbac/can";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { SessionAccess } from "@/types/access";
import {
  REVIEW_PAGE_SIZE,
  toBoolean,
  type ReviewFilters,
} from "@/features/reviews/schemas";

export type ReviewsResult =
  | {
      ok: true;
      /** Null when the filters leave reported reviews out or the page is past the first. */
      reported: { rows: ReviewListRow[]; capped: boolean } | null;
      /** Null when only reported reviews are asked for. */
      others: { rows: ReviewListRow[]; hasNext: boolean } | null;
      /** Open report cases by review id; null without support.read. */
      reportCases: Map<string, ReviewReportCase[]> | null;
      /** Authors' (clients') avatars for both lists; empty without users.read or on failure. */
      avatars: UserAvatarMap;
      trainerName: string | null;
    }
  | { ok: false; error: string };

export async function loadReviews(
  client: AppSupabaseClient,
  access: SessionAccess,
  filters: ReviewFilters,
): Promise<ReviewsResult> {
  const hidden = toBoolean(filters.hidden);
  const onlyReported = filters.reported === "yes";
  const showReported = filters.reported !== "no" && (onlyReported || filters.page === 1);
  const showOthers = !onlyReported;
  try {
    const [reported, others] = await Promise.all([
      showReported
        ? listReviews(client, {
            hidden,
            trainerId: filters.trainerId,
            reported: true,
            limit: REVIEW_LIST_MAX,
            offset: 0,
          })
        : Promise.resolve(null),
      showOthers
        ? listReviews(client, {
            hidden,
            trainerId: filters.trainerId,
            reported: false,
            limit: REVIEW_PAGE_SIZE + 1,
            offset: (filters.page - 1) * REVIEW_PAGE_SIZE,
          })
        : Promise.resolve(null),
    ]);
    const reportedIds = (reported ?? []).map((row) => row.id);
    const reportCases = can(access.permissions, "support.read")
      ? await listOpenReportCases(client, reportedIds)
      : null;
    const shownOthers = others ? others.slice(0, REVIEW_PAGE_SIZE) : null;
    // Reported (up to 200) plus a page of others can pass the batch cap; the helper splits it.
    const avatars = await listUserAvatarsOrEmpty(
      client,
      access.permissions,
      [...(reported ?? []), ...(shownOthers ?? [])].map((row) => row.client_id),
    );
    const firstRow = reported?.[0] ?? others?.[0];
    return {
      ok: true,
      reported: reported ? { rows: reported, capped: reported.length >= REVIEW_LIST_MAX } : null,
      others:
        others && shownOthers ? { rows: shownOthers, hasNext: others.length > REVIEW_PAGE_SIZE } : null,
      reportCases,
      avatars,
      trainerName: filters.trainerId ? (firstRow?.trainer_name ?? null) : null,
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

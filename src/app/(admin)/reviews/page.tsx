import { PageLinks } from "@/components/data-table/page-links";
import { PageHeader } from "@/components/layout/page-header";
import { ReviewFilters } from "@/features/reviews/components/review-filters";
import { ReviewList } from "@/features/reviews/components/review-list";
import { loadReviews } from "@/features/reviews/api";
import {
  REVIEW_PAGE_SIZE,
  parseReviewFilters,
  reviewListHref,
} from "@/features/reviews/schemas";
import { REVIEW_LIST_MAX } from "@/lib/db/reviews";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/reviews");
  const filters = parseReviewFilters(await searchParams);
  const supabase = await createSupabaseServerClient();
  const result = await loadReviews(supabase, access, filters);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Reviews"
        title="Reviews"
        description="Reviews with an open report come first. Hide a review to take it off the listing and out of the rating; restore it the same way. Both need a reason."
      />
      <ReviewFilters filters={filters} trainerName={result.ok ? result.trainerName : null} />
      {result.ok ? (
        <>
          {result.reported ? (
            <section aria-labelledby="reviews-reported" className="flex flex-col gap-3">
              <h2 id="reviews-reported" className="text-lg font-semibold">
                Reported
              </h2>
              <ReviewList
                rows={result.reported.rows}
                avatars={result.avatars}
                reportCases={result.reportCases}
                permissions={access.permissions}
                emptyTitle="No reported reviews"
                emptyDescription="No review matching these filters has an open report."
              />
              {result.reported.capped ? (
                <p className="text-xs text-muted-foreground">
                  Showing the newest {REVIEW_LIST_MAX} reported reviews; older ones are not listed.
                </p>
              ) : null}
            </section>
          ) : null}
          {result.others ? (
            <section aria-labelledby="reviews-others" className="flex flex-col gap-3">
              <h2 id="reviews-others" className="text-lg font-semibold">
                {filters.reported === "no" ? "Not reported" : "Everything else"}
              </h2>
              <ReviewList
                rows={result.others.rows}
                avatars={result.avatars}
                reportCases={result.reportCases}
                permissions={access.permissions}
                emptyTitle="No reviews"
                emptyDescription="No review without a report matches these filters."
              />
              <PageLinks
                label="Review pages"
                noun="reviews"
                page={filters.page}
                pageSize={REVIEW_PAGE_SIZE}
                shown={result.others.rows.length}
                previousHref={filters.page > 1 ? reviewListHref(filters, { page: filters.page - 1 }) : null}
                nextHref={result.others.hasNext ? reviewListHref(filters, { page: filters.page + 1 }) : null}
              />
            </section>
          ) : null}
        </>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}

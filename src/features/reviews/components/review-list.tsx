import Link from "next/link";
import { Flag, Star } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/features/applications/format";
import { ModerateReviewDialog } from "@/features/reviews/components/moderate-review-dialog";
import { permittedHref } from "@/features/support/format";
import { SUPPORT_STATUS_LABELS } from "@/features/support/schemas";
import type { ReviewListRow, ReviewReportCase } from "@/lib/db/reviews";

const linkClass = "focus-ring rounded-sm font-medium underline-offset-4 hover:underline";

function NameLink({ href, name }: { href: string | null; name: string }) {
  return href ? (
    <Link href={href} className={linkClass}>
      {name}
    </Link>
  ) : (
    <span className="font-medium">{name}</span>
  );
}

function Reports({
  count,
  cases,
  permissions,
}: {
  count: number;
  cases: ReviewReportCase[] | null;
  permissions: readonly string[];
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-destructive">
      <Flag size={16} aria-hidden="true" />
      <span className="font-medium">
        {count} open {count === 1 ? "report" : "reports"}
      </span>
      {cases === null ? (
        <span className="text-xs text-muted-foreground">
          Opening the cases needs the View support cases permission (support.read).
        </span>
      ) : (
        cases.map((item, index) => {
          const href = permittedHref(permissions, `/support/${item.id}`);
          const label = `Case ${index + 1}, ${SUPPORT_STATUS_LABELS[item.status].toLowerCase()}`;
          return href ? (
            <Link key={item.id} href={href} className={`${linkClass} text-foreground`}>
              {label}
            </Link>
          ) : (
            <span key={item.id} className="text-muted-foreground">
              {label}
            </span>
          );
        })
      )}
    </div>
  );
}

/**
 * Reviews as cards: rating, text, author, trainer and client, the booking it belongs to, open
 * reports with links to their cases, and for a hidden review the reason, who hid it and when.
 * Each card has Hide or Restore. Gated by reviews.moderate; every link only when the session
 * may open the page behind it.
 */
export function ReviewList({
  rows,
  reportCases,
  permissions,
  emptyTitle,
  emptyDescription,
}: {
  rows: ReviewListRow[];
  reportCases: Map<string, ReviewReportCase[]> | null;
  permissions: readonly string[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (rows.length === 0) {
    return <EmptyState icon={Star} title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const bookingHref = permittedHref(permissions, `/bookings/${row.booking_id}`);
        const author = row.author_display_name || "A client";
        return (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-tile transition-colors hover:bg-surface-raised"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Star size={16} aria-hidden="true" className="text-warning" />
                  <span>
                    {row.rating}
                    <span className="text-muted-foreground"> of 5</span>
                  </span>
                  <span className="font-normal text-muted-foreground">by {author}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Client{" "}
                  <NameLink
                    href={permittedHref(permissions, `/users/${row.client_id}`)}
                    name={row.client_name || "Unnamed"}
                  />
                  {", trainer "}
                  <NameLink
                    href={
                      permittedHref(permissions, `/trainers/${row.trainer_id}`) ??
                      permittedHref(permissions, `/users/${row.trainer_id}`)
                    }
                    name={row.trainer_name || "Unnamed"}
                  />
                  {`, ${formatDateTime(row.created_at)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {row.hidden ? (
                  <Badge variant="outline" className="border-destructive text-destructive">
                    Hidden
                  </Badge>
                ) : null}
                <ModerateReviewDialog reviewId={row.id} authorName={author} hidden={row.hidden} />
              </div>
            </div>
            <p className="text-sm whitespace-pre-line">
              {row.body.trim() ? row.body : <span className="text-muted-foreground">No written review.</span>}
            </p>
            {row.hidden ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Hidden{row.hidden_at ? ` ${formatDateTime(row.hidden_at)}` : ""}
                  {row.hidden_by_name ? ` by ${row.hidden_by_name}` : ""}:
                </span>{" "}
                {row.hidden_reason || "No reason recorded."}
              </p>
            ) : null}
            <Reports
              count={row.open_reports}
              cases={reportCases ? (reportCases.get(row.id) ?? []) : null}
              permissions={permissions}
            />
            {bookingHref ? (
              <Link href={bookingHref} className={`${linkClass} w-fit text-sm`}>
                Open the booking
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

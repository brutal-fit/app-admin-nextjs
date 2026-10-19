import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@/components/icons";
import { SUPPORT_PAGE_SIZE, supportListHref, type SupportFilters } from "@/features/support/schemas";

const linkClass =
  "focus-ring inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent";
const disabledClass =
  "inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground";

/** Previous and next links, 50 cases a page; the page number lives in the URL. */
export function SupportPagination({
  filters,
  shown,
  hasNext,
}: {
  filters: SupportFilters;
  shown: number;
  hasNext: boolean;
}) {
  const from = shown === 0 ? 0 : (filters.page - 1) * SUPPORT_PAGE_SIZE + 1;
  const to = (filters.page - 1) * SUPPORT_PAGE_SIZE + shown;
  const hasPrevious = filters.page > 1;
  if (!hasPrevious && !hasNext) return null;
  return (
    <nav aria-label="Queue pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Page {filters.page}
        {shown > 0 ? `, cases ${from} to ${to}` : ""}
      </p>
      <div className="flex gap-2">
        {hasPrevious ? (
          <Link
            href={supportListHref(filters, { page: filters.page - 1 })}
            rel="prev"
            className={linkClass}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            <ArrowLeft size={14} aria-hidden="true" />
            Previous
          </span>
        )}
        {hasNext ? (
          <Link
            href={supportListHref(filters, { page: filters.page + 1 })}
            rel="next"
            className={linkClass}
          >
            Next
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            Next
            <ArrowRight size={14} aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}

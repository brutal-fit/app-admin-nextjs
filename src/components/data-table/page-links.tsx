import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@/components/icons";

const linkClass =
  "focus-ring inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent";
const disabledClass =
  "inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground";

/**
 * Previous and next links for a URL-paged list; the page number lives in the URL. Renders
 * nothing when everything fits on one page.
 */
export function PageLinks({
  label,
  noun,
  page,
  pageSize,
  shown,
  previousHref,
  nextHref,
}: {
  /** Accessible name of the nav, such as "Booking pages". */
  label: string;
  /** Plural noun for the range line, such as "bookings". */
  noun: string;
  page: number;
  pageSize: number;
  shown: number;
  previousHref: string | null;
  nextHref: string | null;
}) {
  if (!previousHref && !nextHref) return null;
  const from = shown === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = (page - 1) * pageSize + shown;
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Page {page}
        {shown > 0 ? `, ${noun} ${from} to ${to}` : ""}
      </p>
      <div className="flex gap-2">
        {previousHref ? (
          <Link href={previousHref} rel="prev" className={linkClass}>
            <ArrowLeft size={14} aria-hidden="true" />
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            <ArrowLeft size={14} aria-hidden="true" />
            Previous
          </span>
        )}
        {nextHref ? (
          <Link href={nextHref} rel="next" className={linkClass}>
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

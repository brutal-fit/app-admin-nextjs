import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/icons";
import { permittedHref } from "@/features/support/format";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_ORDER } from "@/features/users/format";
import type { UserDetail } from "@/lib/db/users";

function SectionLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <Link
      href={href}
      className="focus-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium underline-offset-4 hover:underline"
    >
      {label}
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-tile">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Bookings by status, open support cases and review counts, all from admin_get_user_detail.
 * Links show only when the session may open the page and the page exists (permittedHref), so
 * the bookings and reviews links appear once those pages land.
 */
export function UserOverview({
  detail,
  permissions,
}: {
  detail: UserDetail;
  permissions: readonly string[];
}) {
  const isTrainer = detail.platform_role === "trainer";
  const bookingCounts = detail.counts.bookings;
  const totalBookings = Object.values(bookingCounts).reduce((sum, value) => sum + value, 0);
  const statuses = BOOKING_STATUS_ORDER.filter((status) => (bookingCounts[status] ?? 0) > 0);
  const name = detail.full_name?.trim() ?? "";

  const bookingsHref = permittedHref(
    permissions,
    `/bookings?${isTrainer ? "trainer" : "client"}=${encodeURIComponent(detail.id)}`,
  );
  // The queue searches subject, details, target label and reporter name; there is no reporter id filter.
  const supportHref = name
    ? permittedHref(permissions, `/support?q=${encodeURIComponent(name.slice(0, 100))}`)
    : null;
  const reviewsHref = isTrainer
    ? permittedHref(permissions, `/reviews?trainer=${encodeURIComponent(detail.id)}`)
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card id="user-bookings" title="Bookings">
        <p className="text-2xl font-semibold tabular-nums">{totalBookings}</p>
        {statuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings as client or trainer.</p>
        ) : (
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            {statuses.map((status) => (
              <div key={status} className="contents">
                <dt className="text-muted-foreground">{BOOKING_STATUS_LABELS[status]}</dt>
                <dd className="text-right tabular-nums">{bookingCounts[status]}</dd>
              </div>
            ))}
          </dl>
        )}
        <SectionLink href={bookingsHref} label="Open bookings" />
      </Card>

      <Card id="user-support" title="Support cases">
        <p className="text-2xl font-semibold tabular-nums">{detail.counts.open_cases}</p>
        <p className="text-sm text-muted-foreground">
          {detail.counts.open_cases === 1 ? "Open case reported by this user." : "Open cases reported by this user."}
        </p>
        <SectionLink href={supportHref} label="Search cases by name" />
      </Card>

      <Card id="user-reviews" title="Reviews">
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Written</dt>
          <dd className="text-right tabular-nums">{detail.counts.reviews_written}</dd>
          <dt className="text-muted-foreground">Received</dt>
          <dd className="text-right tabular-nums">{detail.counts.reviews_received}</dd>
        </dl>
        <SectionLink href={reviewsHref} label="Open reviews" />
      </Card>
    </div>
  );
}

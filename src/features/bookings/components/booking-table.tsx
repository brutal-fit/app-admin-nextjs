"use client";

import Link from "next/link";
import { ArrowRight, Calendar } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatInr } from "@/features/applications/format";
import { MODE_LABELS } from "@/features/applications/schemas";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { PaymentStatusBadge } from "@/features/bookings/components/payment-status-badge";
import { formatSessionRange } from "@/features/bookings/format";
import { PAYMENT_STATUS_LABELS } from "@/features/bookings/schemas";
import { BOOKING_STATUS_LABELS } from "@/features/users/format";
import type { BookingListRow } from "@/lib/db/bookings";

const linkClass = "focus-ring rounded-sm underline-offset-4 hover:underline";

function PartyLink({ href, name }: { href: string | null; name: string }) {
  return href ? (
    <Link href={href} className={linkClass}>
      {name}
    </Link>
  ) : (
    <>{name}</>
  );
}

function columns(links: { users: boolean; trainers: boolean }): DataTableColumn<BookingListRow>[] {
  return [
    {
      id: "session",
      header: "Session",
      sortValue: (row) => new Date(row.start_at).getTime(),
      cell: (row) => (
        <Link href={`/bookings/${row.id}`} className={`${linkClass} font-medium`}>
          {formatSessionRange(row.start_at, row.end_at)}
        </Link>
      ),
    },
    {
      id: "client",
      header: "Client",
      sortValue: (row) => row.client_name,
      cell: (row) => (
        <PartyLink
          href={links.users ? `/users/${row.client_id}` : null}
          name={row.client_name || "Unnamed"}
        />
      ),
    },
    {
      id: "trainer",
      header: "Trainer",
      sortValue: (row) => row.trainer_name,
      cell: (row) => (
        <PartyLink
          href={links.trainers ? `/trainers/${row.trainer_id}` : links.users ? `/users/${row.trainer_id}` : null}
          name={row.trainer_name || "Unnamed"}
        />
      ),
    },
    { id: "mode", header: "Mode", sortValue: (row) => row.mode, cell: (row) => MODE_LABELS[row.mode] },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => BOOKING_STATUS_LABELS[row.status],
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <BookingStatusBadge status={row.status} />
          {row.dispute ? (
            <span
              className={
                row.dispute.state === "open" ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"
              }
            >
              {row.dispute.state === "open" ? "Dispute open" : "Dispute resolved"}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "payment",
      header: "Payment",
      sortValue: (row) => PAYMENT_STATUS_LABELS[row.payment_status],
      cell: (row) => <PaymentStatusBadge status={row.payment_status} />,
    },
    {
      id: "price",
      header: "Price",
      sortValue: (row) => row.price_snapshot_inr,
      cell: (row) => formatInr(row.price_snapshot_inr),
      className: "tabular-nums",
    },
  ];
}

/**
 * Bookings in the server's order (newest session first). Gated by bookings.read; client links
 * need users.read, trainer links open the trainer page with applications.read.
 */
export function BookingTable({
  rows,
  filtered,
  usersVisible,
  trainersVisible,
}: {
  rows: BookingListRow[];
  filtered: boolean;
  usersVisible: boolean;
  trainersVisible: boolean;
}) {
  return (
    <DataTable
      rows={rows}
      columns={columns({ users: usersVisible, trainers: trainersVisible })}
      rowKey={(row) => row.id}
      caption="Bookings"
      countLabel={(count) => `${count} ${count === 1 ? "booking" : "bookings"} on this page`}
      empty={
        <EmptyState
          icon={Calendar}
          title="No bookings"
          description={
            filtered
              ? "No booking matches these filters. Clear them to see every booking."
              : "Nobody has booked a session yet."
          }
        />
      }
      rowActions={(row) => (
        <Link
          href={`/bookings/${row.id}`}
          aria-label={`Open the booking on ${formatSessionRange(row.start_at, row.end_at)}`}
          className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-accent"
          tabIndex={-1}
        >
          Open
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    />
  );
}

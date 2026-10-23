"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar/avatar";
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
import type { UserAvatarMap } from "@/lib/db/avatars";
import type { BookingListRow } from "@/lib/db/bookings";
import type { AvatarRef } from "@/lib/utils/avatar";

const linkClass = "focus-ring rounded-sm underline-offset-4 hover:underline";

function PartyLink({ href, name, avatar }: { href: string | null; name: string; avatar: AvatarRef | undefined }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar name={name} avatar={avatar} />
      {href ? (
        <Link href={href} className={linkClass}>
          {name}
        </Link>
      ) : (
        name
      )}
    </span>
  );
}

/** A gym booking the gym has not allotted yet: no trainer to show, so the gym instead. */
function AwaitingAllotment({ gymName }: { gymName: string | undefined }) {
  return (
    <span className="flex flex-col">
      <span className="text-muted-foreground">Awaiting gym allotment</span>
      {gymName ? <span className="text-xs text-muted-foreground">{gymName}</span> : null}
    </span>
  );
}

function columns(
  links: { users: boolean; trainers: boolean },
  avatars: UserAvatarMap,
  gymNames: Record<string, string>,
): DataTableColumn<BookingListRow>[] {
  return [
    {
      id: "session",
      header: "Session",
      className: "min-w-40 whitespace-normal",
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
      className: "min-w-36 whitespace-normal",
      sortValue: (row) => row.client_name,
      cell: (row) => (
        <PartyLink
          href={links.users ? `/users/${row.client_id}` : null}
          name={row.client_name || "Unnamed"}
          avatar={avatars[row.client_id]}
        />
      ),
    },
    {
      id: "trainer",
      header: "Trainer",
      className: "min-w-36 whitespace-normal",
      sortValue: (row) => row.trainer_name,
      cell: (row) =>
        row.trainer_id === null ? (
          <AwaitingAllotment gymName={gymNames[row.id]} />
        ) : (
          <PartyLink
            href={links.trainers ? `/trainers/${row.trainer_id}` : links.users ? `/users/${row.trainer_id}` : null}
            name={row.trainer_name || "Unnamed"}
            avatar={avatars[row.trainer_id]}
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
 * need users.read, trainer links open the trainer page with applications.read. A gym booking
 * without a trainer reads "Awaiting gym allotment" with the gym's name.
 */
export function BookingTable({
  rows,
  avatars,
  gymNames = {},
  filtered,
  usersVisible,
  trainersVisible,
}: {
  rows: BookingListRow[];
  /** Avatars by user id; a missing id shows initials. */
  avatars: UserAvatarMap;
  /** Gym names by booking id for rows without a trainer; a missing id shows no name. */
  gymNames?: Record<string, string>;
  filtered: boolean;
  usersVisible: boolean;
  trainersVisible: boolean;
}) {
  return (
    <DataTable
      rows={rows}
      columns={columns({ users: usersVisible, trainers: trainersVisible }, avatars, gymNames)}
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

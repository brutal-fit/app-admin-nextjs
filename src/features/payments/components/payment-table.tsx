"use client";

import Link from "next/link";
import { ArrowRight, CreditCard } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatInr } from "@/features/applications/format";
import { formatSessionRange } from "@/features/bookings/format";
import { CopyIdButton } from "@/features/payments/components/copy-id-button";
import { PaymentStateBadge } from "@/features/payments/components/payment-state-badge";
import { shortId } from "@/features/payments/format";
import { PAYMENT_STATE_LABELS, needsAttention } from "@/features/payments/schemas";
import type { PaymentBooking, PaymentListRow } from "@/lib/db/payments";

const linkClass = "focus-ring rounded-sm underline-offset-4 hover:underline";

/** The bookings for the rows, or why they are missing (shown once above the table). */
export type PaymentTableBookings = { visible: true; bookings: Record<string, PaymentBooking> } | { visible: false };

function columns(
  bookings: PaymentTableBookings,
  links: { bookings: boolean; users: boolean; trainers: boolean; gyms: boolean },
  now: number,
): DataTableColumn<PaymentListRow>[] {
  const bookingOf = (row: PaymentListRow): PaymentBooking | null =>
    bookings.visible ? (bookings.bookings[row.booking_id] ?? null) : null;
  const hidden = <span className="text-muted-foreground">Hidden</span>;
  return [
    {
      id: "date",
      header: "Date",
      sortValue: (row) => new Date(row.created_at).getTime(),
      cell: (row) => (
        <Link href={`/payments/${row.id}`} className={`${linkClass} font-medium whitespace-nowrap`}>
          {formatDateTime(row.created_at)}
        </Link>
      ),
    },
    {
      id: "booking",
      header: "Booking",
      sortValue: (row) => bookingOf(row)?.startAt ?? row.booking_id,
      cell: (row) => {
        const booking = bookingOf(row);
        const text = booking ? formatSessionRange(booking.startAt, booking.endAt) : `Booking ${shortId(row.booking_id)}`;
        return links.bookings ? (
          <Link href={`/bookings/${row.booking_id}`} className={linkClass}>
            {text}
          </Link>
        ) : (
          text
        );
      },
    },
    {
      id: "client",
      header: "Client",
      sortValue: (row) => bookingOf(row)?.clientName ?? null,
      cell: (row) => {
        if (!bookings.visible) return hidden;
        const booking = bookingOf(row);
        if (!booking) return <span className="text-muted-foreground">Not found</span>;
        const name = booking.clientName || "Unnamed";
        return links.users ? (
          <Link href={`/users/${booking.clientId}`} className={linkClass}>
            {name}
          </Link>
        ) : (
          name
        );
      },
    },
    {
      id: "provider",
      header: "Trainer or gym",
      sortValue: (row) => bookingOf(row)?.trainerName ?? bookingOf(row)?.gymName ?? null,
      cell: (row) => {
        if (!bookings.visible) return hidden;
        const booking = bookingOf(row);
        if (!booking) return <span className="text-muted-foreground">Not found</span>;
        if (booking.gymId) {
          const gymName = booking.gymName || "Gym";
          return (
            <span className="flex flex-col">
              {links.gyms ? (
                <Link href={`/gyms/${booking.gymId}`} className={linkClass}>
                  {gymName}
                </Link>
              ) : (
                gymName
              )}
              <span className="text-xs text-muted-foreground">
                {booking.trainerName ? `Trainer: ${booking.trainerName}` : "Awaiting gym allotment"}
              </span>
            </span>
          );
        }
        const name = booking.trainerName || "Unnamed";
        return links.trainers && booking.trainerId ? (
          <Link href={`/trainers/${booking.trainerId}`} className={linkClass}>
            {name}
          </Link>
        ) : (
          name
        );
      },
    },
    {
      id: "amount",
      header: "Amount",
      sortValue: (row) => row.amount_inr,
      cell: (row) => formatInr(row.amount_inr),
      className: "tabular-nums",
    },
    {
      id: "state",
      header: "State",
      sortValue: (row) => PAYMENT_STATE_LABELS[row.state],
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <PaymentStateBadge state={row.state} />
          {needsAttention(row, now) ? (
            <span className="text-xs font-medium text-destructive">Needs attention</span>
          ) : null}
        </div>
      ),
    },
    {
      id: "order",
      header: "Order id",
      sortValue: (row) => row.order_id,
      cell: (row) => <CopyIdButton value={row.order_id} label="Order id" />,
    },
    {
      id: "payment",
      header: "Payment id",
      sortValue: (row) => row.payment_id,
      cell: (row) =>
        row.payment_id ? (
          <span className="font-mono text-xs">{row.payment_id}</span>
        ) : (
          <span className="text-muted-foreground">None yet</span>
        ),
    },
  ];
}

/**
 * Payments newest first, as the server returned them. Gated by payments.read; the session
 * columns need bookings.read, and each party link only shows when its page may be opened.
 * `now` comes from the server so "Needs attention" is the same on every render.
 */
export function PaymentTable({
  rows,
  bookings,
  links,
  now,
  filtered,
}: {
  rows: PaymentListRow[];
  bookings: PaymentTableBookings;
  links: { bookings: boolean; users: boolean; trainers: boolean; gyms: boolean };
  now: number;
  filtered: boolean;
}) {
  return (
    <DataTable
      rows={rows}
      columns={columns(bookings, links, now)}
      rowKey={(row) => row.id}
      caption="Payments"
      countLabel={(count) => `${count} ${count === 1 ? "payment" : "payments"} on this page`}
      empty={
        <EmptyState
          icon={CreditCard}
          title="No payments"
          description={
            filtered
              ? "No payment matches these filters. Clear them to see the last 30 days."
              : "No payment in the last 30 days."
          }
        />
      }
      rowActions={(row) => (
        <Link
          href={`/payments/${row.id}`}
          aria-label={`Open the payment of order ${row.order_id}`}
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

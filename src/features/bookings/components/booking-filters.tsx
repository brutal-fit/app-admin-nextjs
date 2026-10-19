"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { Filter, X } from "@/components/icons";
import { FilterChips } from "@/components/data-table/filter-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MODE_LABELS } from "@/features/applications/schemas";
import {
  BOOKING_MODES,
  BOOKING_STATUSES,
  bookingListHref,
  hasBookingFilters,
  type BookingFilters as Filters,
} from "@/features/bookings/schemas";
import { BOOKING_STATUS_LABELS } from "@/features/users/format";
import { isIsoDate } from "@/lib/utils/time";

const removeClass =
  "focus-ring inline-flex items-center gap-1.5 rounded-full border border-primary px-3 py-1 text-sm text-foreground hover:bg-accent";

/**
 * Every list filter lives in the URL (status, mode, from, to, trainer, client, page), so a
 * filtered list can be shared and the back button restores it. Chips are links; the date
 * range is a small form. Trainer and client filters arrive from the user and trainer pages
 * and show here as removable chips. Gated by bookings.read.
 */
export function BookingFilters({
  filters,
  today,
  trainerName,
  clientName,
}: {
  filters: Filters;
  /** Today in India, "YYYY-MM-DD", read on the server. */
  today: string;
  trainerName: string | null;
  clientName: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const read = (name: string) => {
      const value = String(form.get(name) ?? "");
      return isIsoDate(value) ? value : null;
    };
    startTransition(() => router.push(bookingListHref(filters, { from: read("from"), to: read("to") })));
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <FilterChips
        label="Filter by status"
        chips={[
          {
            id: "all",
            label: "All statuses",
            active: filters.status === null,
            href: bookingListHref(filters, { status: null }),
          },
          ...BOOKING_STATUSES.map((status) => ({
            id: status,
            label: BOOKING_STATUS_LABELS[status],
            active: filters.status === status,
            href: bookingListHref(filters, { status: filters.status === status ? null : status }),
          })),
        ]}
      />
      <FilterChips
        label="Filter by mode"
        chips={[
          {
            id: "all",
            label: "Home and online",
            active: filters.mode === null,
            href: bookingListHref(filters, { mode: null }),
          },
          ...BOOKING_MODES.map((mode) => ({
            id: mode,
            label: MODE_LABELS[mode],
            active: filters.mode === mode,
            href: bookingListHref(filters, { mode: filters.mode === mode ? null : mode }),
          })),
        ]}
      />

      <div className="flex flex-wrap items-end gap-3">
        <form onSubmit={onDates} className="flex flex-wrap items-end gap-2" aria-label="Session dates">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bookings-from">From</Label>
            <Input
              id="bookings-from"
              name="from"
              type="date"
              defaultValue={filters.from ?? ""}
              className="w-44"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bookings-to">To</Label>
            <Input id="bookings-to" name="to" type="date" defaultValue={filters.to ?? ""} className="w-44" />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            <Filter size={16} aria-hidden="true" />
            Apply dates
          </Button>
        </form>
        <Link
          href={bookingListHref(filters, { from: today, to: today })}
          className="focus-ring inline-flex items-center rounded-md px-2 py-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          Today
        </Link>
        {filters.trainerId ? (
          <Link href={bookingListHref(filters, { trainerId: null })} className={removeClass}>
            Trainer: {trainerName ?? "selected trainer"}
            <span className="sr-only">, remove this filter</span>
            <X size={14} aria-hidden="true" />
          </Link>
        ) : null}
        {filters.clientId ? (
          <Link href={bookingListHref(filters, { clientId: null })} className={removeClass}>
            Client: {clientName ?? "selected client"}
            <span className="sr-only">, remove this filter</span>
            <X size={14} aria-hidden="true" />
          </Link>
        ) : null}
        {hasBookingFilters(filters) ? (
          <Link
            href="/bookings"
            className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <X size={14} aria-hidden="true" />
            Clear all
          </Link>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Dates are India time and include both ends. The list shows every status; pick one above
        to narrow it.
      </p>
    </div>
  );
}

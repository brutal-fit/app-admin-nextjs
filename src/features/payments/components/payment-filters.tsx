"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { AlertCircle, Filter, Search, X } from "@/components/icons";
import { FilterChips } from "@/components/data-table/filter-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PAYMENT_SEARCH_MAX,
  PAYMENT_STATES,
  PAYMENT_STATE_LABELS,
  SEARCH_HINT,
  hasPaymentFilters,
  paymentListHref,
  type PaymentFilters as Filters,
} from "@/features/payments/schemas";
import { isIsoDate } from "@/lib/utils/time";

/**
 * Every list filter lives in the URL (state or Needs attention, from, to, q, page), so a
 * filtered list can be shared. State chips and Needs attention are links; the dates and the
 * search are small forms. Gated by payments.read.
 */
export function PaymentFilters({
  filters,
  range,
}: {
  filters: Filters;
  /** The dates the list read, India time: the URL's, or the default last 30 days. */
  range: { from: string | null; to: string | null };
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
    startTransition(() => router.push(paymentListHref(filters, { from: read("from"), to: read("to") })));
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    startTransition(() => router.push(paymentListHref(filters, { q })));
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <FilterChips
        label="Filter by state"
        chips={[
          {
            id: "all",
            label: "All states",
            active: filters.state === null && !filters.attention,
            href: paymentListHref(filters, { state: null, attention: false }),
          },
          ...PAYMENT_STATES.map((state) => ({
            id: state,
            label: PAYMENT_STATE_LABELS[state],
            active: filters.state === state,
            href: paymentListHref(filters, { state: filters.state === state ? null : state, attention: false }),
          })),
        ]}
      />
      <FilterChips
        label="Quick filters"
        chips={[
          {
            id: "attention",
            label: "Needs attention",
            active: filters.attention,
            href: paymentListHref(filters, { attention: !filters.attention, state: null }),
          },
        ]}
      >
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertCircle size={14} aria-hidden="true" />
          Refunds that failed, and refunds queued more than an hour ago.
        </span>
      </FilterChips>

      <div className="flex flex-wrap items-end gap-3">
        <form onSubmit={onSearch} role="search" className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payments-search">Search</Label>
            <Input
              id="payments-search"
              name="q"
              defaultValue={filters.q}
              placeholder="Booking id, order_..., pay_... or phone"
              maxLength={PAYMENT_SEARCH_MAX}
              className="w-72"
              aria-describedby="payments-search-hint"
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            <Search size={16} aria-hidden="true" />
            Search
          </Button>
        </form>
        <form onSubmit={onDates} className="flex flex-wrap items-end gap-2" aria-label="Payment dates">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payments-from">From</Label>
            <Input id="payments-from" name="from" type="date" defaultValue={range.from ?? ""} className="w-44" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payments-to">To</Label>
            <Input id="payments-to" name="to" type="date" defaultValue={range.to ?? ""} className="w-44" />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            <Filter size={16} aria-hidden="true" />
            Apply dates
          </Button>
        </form>
        {hasPaymentFilters(filters) ? (
          <Link
            href="/payments"
            className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <X size={14} aria-hidden="true" />
            Clear all
          </Link>
        ) : null}
      </div>
      <p id="payments-search-hint" className="text-xs text-muted-foreground">
        {SEARCH_HINT} Dates are India time, by when the order was created, and include both ends.
        Without dates the list shows the last 30 days; a search or Needs attention looks at every
        date.
      </p>
    </div>
  );
}

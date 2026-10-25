"use client";

import Link from "next/link";
import { ArrowRight, Repeat } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatInr } from "@/features/applications/format";
import { MODE_LABELS } from "@/features/applications/schemas";
import { shortId } from "@/features/payments/format";
import type { PartyNames, SubscriptionListItem } from "@/features/subscriptions/api";
import { PeriodStatusBadge } from "@/features/subscriptions/components/period-status-badge";
import { SubscriptionStatusBadge } from "@/features/subscriptions/components/subscription-status-badge";
import { formatDateRange } from "@/features/subscriptions/format";
import { SUBSCRIPTION_PERIOD_LABELS, SUBSCRIPTION_STATUS_LABELS } from "@/features/subscriptions/schemas";

const linkClass = "focus-ring rounded-sm underline-offset-4 hover:underline";

function columns(
  names: PartyNames,
  links: { users: boolean; trainers: boolean },
): DataTableColumn<SubscriptionListItem>[] {
  const clientName = (item: SubscriptionListItem) =>
    names.clients[item.subscription.client_id] ?? `Client ${shortId(item.subscription.client_id)}`;
  const trainerName = (item: SubscriptionListItem) =>
    names.trainers[item.subscription.trainer_id] ?? `Trainer ${shortId(item.subscription.trainer_id)}`;
  return [
    {
      id: "created",
      header: "Requested",
      sortValue: (item) => new Date(item.subscription.created_at).getTime(),
      cell: (item) => (
        <Link href={`/subscriptions/${item.subscription.id}`} className={`${linkClass} font-medium whitespace-nowrap`}>
          {formatDateTime(item.subscription.created_at)}
        </Link>
      ),
    },
    {
      id: "client",
      header: "Client",
      className: "min-w-32 whitespace-normal",
      sortValue: clientName,
      cell: (item) =>
        links.users ? (
          <Link href={`/users/${item.subscription.client_id}`} className={linkClass}>
            {clientName(item)}
          </Link>
        ) : (
          clientName(item)
        ),
    },
    {
      id: "trainer",
      header: "Trainer",
      className: "min-w-32 whitespace-normal",
      sortValue: trainerName,
      cell: (item) =>
        links.trainers ? (
          <Link href={`/trainers/${item.subscription.trainer_id}`} className={linkClass}>
            {trainerName(item)}
          </Link>
        ) : (
          trainerName(item)
        ),
    },
    {
      id: "plan",
      header: "Plan",
      className: "min-w-36 whitespace-normal",
      sortValue: (item) => item.subscription.weeks,
      cell: (item) => (
        <span className="flex flex-col">
          <span>
            {SUBSCRIPTION_PERIOD_LABELS[item.subscription.period]}, {item.subscription.sessions_per_week} a week
          </span>
          <span className="text-xs text-muted-foreground">{MODE_LABELS[item.subscription.mode]}</span>
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (item) => SUBSCRIPTION_STATUS_LABELS[item.subscription.status],
      cell: (item) => <SubscriptionStatusBadge status={item.subscription.status} />,
    },
    {
      id: "period",
      header: "Current period",
      className: "min-w-40 whitespace-normal",
      sortValue: (item) => item.current?.starts_on ?? null,
      cell: (item) =>
        item.current ? (
          <span className="flex flex-col items-start gap-1">
            <span className="text-xs text-muted-foreground">
              Period {item.current.seq}, {formatDateRange(item.current.starts_on, item.current.ends_on)}
            </span>
            <PeriodStatusBadge status={item.current.status} />
          </span>
        ) : (
          <span className="text-muted-foreground">No periods</span>
        ),
    },
    {
      id: "price",
      header: "Per period",
      className: "tabular-nums",
      sortValue: (item) => item.subscription.period_price_inr,
      cell: (item) => formatInr(item.subscription.period_price_inr),
    },
    {
      id: "credits",
      header: "Credits",
      className: "tabular-nums",
      sortValue: (item) => item.subscription.credits,
      cell: (item) => item.subscription.credits,
    },
  ];
}

/**
 * Subscriptions newest first, as the server returned them, with the period each is in now.
 * Gated by bookings.read; party links show only when their page may be opened.
 */
export function SubscriptionTable({
  items,
  names,
  links,
  filtered,
}: {
  items: SubscriptionListItem[];
  names: PartyNames;
  links: { users: boolean; trainers: boolean };
  filtered: boolean;
}) {
  return (
    <DataTable
      rows={items}
      columns={columns(names, links)}
      rowKey={(item) => item.subscription.id}
      caption="Subscriptions"
      countLabel={(count) => `${count} ${count === 1 ? "subscription" : "subscriptions"} on this page`}
      empty={
        <EmptyState
          icon={Repeat}
          title="No subscriptions"
          description={filtered ? "No subscription matches these filters." : "No client has asked for a subscription yet."}
        />
      }
      rowActions={(item) => (
        <Link
          href={`/subscriptions/${item.subscription.id}`}
          aria-label={`Open the subscription requested ${formatDateTime(item.subscription.created_at)}`}
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

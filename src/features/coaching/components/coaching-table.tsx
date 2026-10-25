"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatInr } from "@/features/applications/format";
import type { CoachingListItem } from "@/features/coaching/api";
import { CoachingStatusBadge } from "@/features/coaching/components/coaching-status-badge";
import { COACHING_STATUS_LABELS } from "@/features/coaching/schemas";
import { shortId } from "@/features/payments/format";
import type { PartyNames } from "@/features/subscriptions/api";
import { PeriodStatusBadge } from "@/features/subscriptions/components/period-status-badge";
import { formatDateRange } from "@/features/subscriptions/format";

const linkClass = "focus-ring rounded-sm underline-offset-4 hover:underline";

function columns(
  names: PartyNames,
  planTitles: Record<string, string>,
  links: { users: boolean; trainers: boolean },
): DataTableColumn<CoachingListItem>[] {
  const clientName = (item: CoachingListItem) =>
    names.clients[item.coaching.client_id] ?? `Client ${shortId(item.coaching.client_id)}`;
  const coachName = (item: CoachingListItem) =>
    names.trainers[item.coaching.coach_id] ?? `Coach ${shortId(item.coaching.coach_id)}`;
  const planTitle = (item: CoachingListItem) =>
    planTitles[item.coaching.plan_id] ?? `Plan ${shortId(item.coaching.plan_id)}`;
  return [
    {
      id: "created",
      header: "Requested",
      sortValue: (item) => new Date(item.coaching.created_at).getTime(),
      cell: (item) => (
        <Link href={`/coaching/${item.coaching.id}`} className={`${linkClass} font-medium whitespace-nowrap`}>
          {formatDateTime(item.coaching.created_at)}
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
          <Link href={`/users/${item.coaching.client_id}`} className={linkClass}>
            {clientName(item)}
          </Link>
        ) : (
          clientName(item)
        ),
    },
    {
      id: "coach",
      header: "Coach",
      className: "min-w-32 whitespace-normal",
      sortValue: coachName,
      cell: (item) =>
        links.trainers ? (
          <Link href={`/trainers/${item.coaching.coach_id}`} className={linkClass}>
            {coachName(item)}
          </Link>
        ) : (
          coachName(item)
        ),
    },
    {
      id: "plan",
      header: "Plan",
      className: "min-w-36 whitespace-normal",
      sortValue: planTitle,
      cell: planTitle,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (item) => COACHING_STATUS_LABELS[item.coaching.status],
      cell: (item) => <CoachingStatusBadge status={item.coaching.status} />,
    },
    {
      id: "month",
      header: "Current month",
      className: "min-w-40 whitespace-normal",
      sortValue: (item) => item.current?.starts_on ?? null,
      cell: (item) =>
        item.current ? (
          <span className="flex flex-col items-start gap-1">
            <span className="text-xs text-muted-foreground">
              Month {item.current.seq}, {formatDateRange(item.current.starts_on, item.current.ends_on)}
            </span>
            <PeriodStatusBadge status={item.current.status} />
          </span>
        ) : (
          <span className="text-muted-foreground">No months</span>
        ),
    },
    {
      id: "fee",
      header: "Fee a month",
      className: "tabular-nums",
      sortValue: (item) => item.coaching.fee_inr,
      cell: (item) => formatInr(item.coaching.fee_inr),
    },
  ];
}

/**
 * Coached library programmes newest first, with the month each is in now. Gated by
 * bookings.read; party links show only when their page may be opened.
 */
export function CoachingTable({
  items,
  names,
  planTitles,
  links,
  filtered,
}: {
  items: CoachingListItem[];
  names: PartyNames;
  planTitles: Record<string, string>;
  links: { users: boolean; trainers: boolean };
  filtered: boolean;
}) {
  return (
    <DataTable
      rows={items}
      columns={columns(names, planTitles, links)}
      rowKey={(item) => item.coaching.id}
      caption="Coaching"
      countLabel={(count) => `${count} ${count === 1 ? "coaching" : "coachings"} on this page`}
      empty={
        <EmptyState
          icon={MessageCircle}
          title="No coaching"
          description={filtered ? "No coaching matches these filters." : "No client has picked a coach yet."}
        />
      }
      rowActions={(item) => (
        <Link
          href={`/coaching/${item.coaching.id}`}
          aria-label={`Open the coaching requested ${formatDateTime(item.coaching.created_at)}`}
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

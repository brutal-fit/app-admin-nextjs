"use client";

import Link from "next/link";
import { ArrowRight, UserCheck } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatInr } from "@/features/applications/format";
import { MODE_LABELS } from "@/features/applications/schemas";
import type { TrainerListItem } from "@/features/trainers/api";
import { formatRating, listedLabel, listedTone } from "@/features/trainers/format";

function rates(row: TrainerListItem): string {
  const parts: string[] = [];
  if (row.homeRateInr !== null) parts.push(`${MODE_LABELS.home} ${formatInr(row.homeRateInr)}`);
  if (row.onlineRateInr !== null) parts.push(`${MODE_LABELS.online} ${formatInr(row.onlineRateInr)}`);
  return parts.length > 0 ? parts.join(", ") : "No price set";
}

const COLUMNS: DataTableColumn<TrainerListItem>[] = [
  {
    id: "name",
    header: "Trainer",
    sortValue: (row) => row.name,
    cell: (row) => (
      <Link
        href={`/trainers/${row.trainerId}`}
        className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline"
      >
        {row.name}
      </Link>
    ),
  },
  {
    id: "listed",
    header: "Listing",
    sortValue: (row) => (row.listed ? 0 : 1),
    cell: (row) => (
      <Badge variant="outline" className={listedTone(row.listed)}>
        {listedLabel(row.listed)}
      </Badge>
    ),
  },
  { id: "city", header: "City", sortValue: (row) => row.city, cell: (row) => row.city },
  {
    id: "rating",
    header: "Rating",
    sortValue: (row) => row.averageRating,
    cell: (row) => formatRating(row.averageRating, row.reviewCount),
  },
  {
    id: "bookings",
    header: "Bookings",
    sortValue: (row) => row.bookings,
    cell: (row) =>
      row.bookings === null ? <span className="text-muted-foreground">Hidden</span> : row.bookings,
    className: "tabular-nums",
  },
  {
    id: "prices",
    header: "Platform price",
    sortValue: (row) => row.homeRateInr ?? row.onlineRateInr,
    cell: (row) => rates(row),
  },
];

/**
 * Approved trainers with their listing state, rating, booking count, city and platform
 * prices. Gated by trainers.read; the bookings column needs bookings.read.
 */
export function TrainerTable({ rows, filtered }: { rows: TrainerListItem[]; filtered: boolean }) {
  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      rowKey={(row) => row.trainerId}
      caption="Approved trainers"
      countLabel={(count) => `${count} ${count === 1 ? "trainer" : "trainers"}`}
      empty={
        <EmptyState
          icon={UserCheck}
          title="No trainers"
          description={
            filtered
              ? "No approved trainer matches this filter."
              : "No application has been approved yet."
          }
        />
      }
      rowActions={(row) => (
        <Link
          href={`/trainers/${row.trainerId}`}
          aria-label={`Open ${row.name}`}
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

"use client";

import Link from "next/link";
import { ArrowRight, Home } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { GymStatusBadge } from "@/features/gyms/components/gym-status-badge";
import { formatRating } from "@/features/trainers/format";
import type { AdminGymListRow } from "@/types/database";

const COLUMNS: DataTableColumn<AdminGymListRow>[] = [
  {
    id: "name",
    header: "Gym",
    sortValue: (row) => row.name,
    cell: (row) => (
      <Link
        href={`/gyms/${row.id}`}
        className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline"
      >
        {row.name}
      </Link>
    ),
  },
  {
    id: "status",
    header: "Status",
    sortValue: (row) => row.status,
    cell: (row) => <GymStatusBadge status={row.status} />,
  },
  {
    id: "area",
    header: "Area",
    sortValue: (row) => `${row.city} ${row.area}`,
    cell: (row) => `${row.area}, ${row.city}`,
  },
  {
    id: "rating",
    header: "Rating",
    sortValue: (row) => row.rating,
    cell: (row) => formatRating(row.rating, row.review_count),
  },
  {
    id: "bookings",
    header: "Bookings",
    sortValue: (row) => row.bookings_count,
    cell: (row) => row.bookings_count,
    className: "tabular-nums",
  },
  {
    id: "prices",
    header: "Prices to set",
    sortValue: (row) => row.pending_prices,
    cell: (row) =>
      row.pending_prices > 0 ? (
        <span className="text-warning">{row.pending_prices} pending</span>
      ) : (
        <span className="text-muted-foreground">None</span>
      ),
  },
  {
    id: "staff",
    header: "Staff",
    sortValue: (row) => row.staff_count,
    cell: (row) => row.staff_count,
    className: "tabular-nums",
  },
];

/**
 * Every gym with its status, area, rating, bookings count and services still waiting for a
 * platform price; submitted gyms first, as admin_list_gyms orders them. Gated by gyms.read.
 */
export function GymTable({ rows, filtered }: { rows: AdminGymListRow[]; filtered: boolean }) {
  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      rowKey={(row) => row.id}
      caption="Gyms"
      countLabel={(count) => `${count} ${count === 1 ? "gym" : "gyms"}`}
      empty={
        <EmptyState
          icon={Home}
          title="No gyms"
          description={filtered ? "No gym matches these filters." : "No gym has been created yet."}
        />
      }
      rowActions={(row) => (
        <Link
          href={`/gyms/${row.id}`}
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

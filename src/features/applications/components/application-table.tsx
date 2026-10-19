"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { FilterChips } from "@/components/data-table/filter-chips";
import { StatusPulse } from "@/components/motion/status-pulse";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { ApplicationListItem, DocumentsFilterState } from "@/features/applications/api";
import { applicationStatusTone, formatDateTime } from "@/features/applications/format";
import {
  APPLICATION_FILTERS,
  APPLICATION_STATUS_LABELS,
  FILTER_LABELS,
  MODE_LABELS,
  applicationListHref,
  type ApplicationFilter,
} from "@/features/applications/schemas";

function timestamp(value: string | null): number | null {
  return value ? new Date(value).getTime() : null;
}

const COLUMNS: DataTableColumn<ApplicationListItem>[] = [
  {
    id: "name",
    header: "Name",
    sortValue: (row) => row.fullName || null,
    cell: (row) => (
      <Link
        href={`/applications/${row.trainerId}`}
        className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline"
      >
        {row.fullName || "Unnamed"}
      </Link>
    ),
  },
  {
    id: "username",
    header: "Username",
    sortValue: (row) => row.username ?? null,
    cell: (row) =>
      row.username ? (
        `@${row.username}`
      ) : (
        <span className="text-muted-foreground">
          {row.username === undefined ? "Hidden" : "None"}
        </span>
      ),
  },
  { id: "city", header: "City", sortValue: (row) => row.city || null, cell: (row) => row.city },
  {
    id: "modes",
    header: "Modes",
    cell: (row) =>
      row.modes.length === 0 ? "None" : row.modes.map((mode) => MODE_LABELS[mode]).join(", "),
  },
  {
    id: "submitted",
    header: "Submitted",
    sortValue: (row) => timestamp(row.submittedAt),
    cell: (row) => formatDateTime(row.submittedAt),
  },
  {
    id: "status",
    header: "Status",
    sortValue: (row) => APPLICATION_STATUS_LABELS[row.status],
    cell: (row) => (
      <StatusPulse value={row.status} className={applicationStatusTone(row.status)}>
        <Badge variant="outline" className={applicationStatusTone(row.status)}>
          {APPLICATION_STATUS_LABELS[row.status]}
        </Badge>
      </StatusPulse>
    ),
  },
];

function emptyDescription(filter: ApplicationFilter, documents: boolean): string {
  const base =
    filter === "all"
      ? "No trainer has submitted an application yet."
      : `No applications are ${FILTER_LABELS[filter].toLowerCase()} right now.`;
  return documents ? `${base} The documents filter is on: only trainers with a document waiting count.` : base;
}

/** Filter chips, the result count and the sortable list of applications. Gated by applications.read. */
export function ApplicationTable({
  rows,
  filter,
  usernamesVisible,
  truncated = false,
  documentsFilter = "off",
}: {
  rows: ApplicationListItem[];
  filter: ApplicationFilter;
  usernamesVisible: boolean;
  truncated?: boolean;
  documentsFilter?: DocumentsFilterState;
}) {
  const documents = documentsFilter === "applied";
  const anyFilter = filter !== "all" || documentsFilter !== "off";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <FilterChips
          label="Filter by status"
          chips={APPLICATION_FILTERS.map((option) => ({
            id: option,
            label: FILTER_LABELS[option],
            active: option === filter,
            href: applicationListHref(option, documents),
          }))}
        />
        <FilterChips
          label="Quick filters"
          chips={[
            {
              id: "awaiting_review",
              label: FILTER_LABELS.awaiting_review,
              active: filter === "awaiting_review",
              href: applicationListHref(filter === "awaiting_review" ? "all" : "awaiting_review", documents),
            },
            {
              id: "documents",
              label: "Unreviewed documents",
              active: documents,
              href: applicationListHref(filter, !documents),
            },
          ]}
        >
          {anyFilter ? (
            <Link
              href="/applications"
              className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Link>
          ) : null}
        </FilterChips>
      </div>

      <DataTable
        rows={rows}
        columns={COLUMNS}
        rowKey={(row) => row.trainerId}
        caption="Trainer applications"
        countLabel={(count) =>
          `${count} ${count === 1 ? "application" : "applications"}${truncated ? " (most recent)" : ""}`
        }
        initialSort={filter === "awaiting_review" ? { columnId: "submitted", direction: "asc" } : null}
        empty={
          <EmptyState
            icon={FileText}
            title="No applications"
            description={emptyDescription(filter, documents)}
          />
        }
        rowActions={(row) => (
          <Link
            href={`/applications/${row.trainerId}`}
            aria-label={`Review ${row.fullName || "this application"}`}
            className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-accent"
            tabIndex={-1}
          >
            Review
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      />

      {documentsFilter === "needs-permission" ? (
        <p className="text-xs text-muted-foreground">
          The unreviewed documents filter needs the Review documents permission, so it is not
          applied.
        </p>
      ) : null}
      {!usernamesVisible ? (
        <p className="text-xs text-muted-foreground">
          Usernames are hidden: they need the View users permission.
        </p>
      ) : null}
      {truncated ? (
        <p className="text-xs text-muted-foreground">
          Showing the {rows.length} most recent applications. Use a status filter to narrow the
          list.
        </p>
      ) : null}
    </div>
  );
}

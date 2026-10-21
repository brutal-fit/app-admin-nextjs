"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar/avatar";
import { ArrowRight, LifeBuoy } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/features/applications/format";
import type { SupportQueueItem } from "@/features/support/api";
import { SupportPriorityBadge } from "@/features/support/components/support-priority-badge";
import { SupportStatusBadge } from "@/features/support/components/support-status-badge";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
} from "@/features/support/schemas";

const PRIORITY_RANK = { safety: 0, high: 1, normal: 2 } as const;

function columns(usersVisible: boolean): DataTableColumn<SupportQueueItem>[] {
  return [
    {
      id: "priority",
      header: "Priority",
      sortValue: (row) => PRIORITY_RANK[row.priority],
      cell: (row) => <SupportPriorityBadge priority={row.priority} />,
    },
    {
      id: "subject",
      header: "Subject",
      sortValue: (row) => row.subject,
      cell: (row) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={`/support/${row.id}`}
            className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline"
          >
            {row.subject}
          </Link>
          {row.targetLabel ? (
            <span className="truncate text-xs text-muted-foreground">{row.targetLabel}</span>
          ) : null}
        </div>
      ),
    },
    {
      id: "reporter",
      header: "Reporter",
      sortValue: (row) => row.reporterName,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <Avatar name={row.reporterName} avatar={row.reporterAvatar} />
          {usersVisible ? (
            <Link
              href={`/users/${row.reporterId}`}
              className="focus-ring rounded-sm underline-offset-4 hover:underline"
            >
              {row.reporterName}
            </Link>
          ) : (
            row.reporterName
          )}
        </span>
      ),
    },
    {
      id: "category",
      header: "Category",
      sortValue: (row) => SUPPORT_CATEGORY_LABELS[row.category],
      cell: (row) => SUPPORT_CATEGORY_LABELS[row.category],
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => SUPPORT_STATUS_LABELS[row.status],
      cell: (row) => <SupportStatusBadge status={row.status} />,
    },
    {
      id: "assignee",
      header: "Assignee",
      sortValue: (row) => row.assigneeName,
      cell: (row) =>
        row.assigneeName ? (
          <span className="flex items-center gap-2">
            <Avatar name={row.assigneeName} avatar={row.assigneeAvatar} />
            {row.assigneeName}
          </span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      id: "updated",
      header: "Updated",
      sortValue: (row) => new Date(row.updatedAt).getTime(),
      cell: (row) => formatDateTime(row.updatedAt),
    },
  ];
}

/**
 * The support queue in the server's order (safety first, then open before resolved, then the
 * newest change). Gated by support.read; reporter links need users.read.
 */
export function SupportQueueTable({
  rows,
  usersVisible,
  filtered,
}: {
  rows: SupportQueueItem[];
  usersVisible: boolean;
  filtered: boolean;
}) {
  return (
    <DataTable
      rows={rows}
      columns={columns(usersVisible)}
      rowKey={(row) => row.id}
      caption="Support cases"
      countLabel={(count) => `${count} ${count === 1 ? "case" : "cases"} on this page`}
      empty={
        <EmptyState
          icon={LifeBuoy}
          title="No support cases"
          description={
            filtered
              ? "No case matches these filters. Clear them to see the whole queue."
              : "Nobody has reported anything yet."
          }
        />
      }
      rowActions={(row) => (
        <Link
          href={`/support/${row.id}`}
          aria-label={`Open ${row.subject}`}
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

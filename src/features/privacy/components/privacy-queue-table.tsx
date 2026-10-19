import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/features/applications/format";
import type { PrivacyQueueItem } from "@/features/privacy/api";
import { hasPrivacyFilters, type PrivacyFilters } from "@/features/privacy/schemas";
import { permittedHref } from "@/features/support/format";
import { PrivacyRequestDialog } from "@/features/users/components/privacy-request-dialog";
import {
  PRIVACY_FINAL_STATUSES,
  PRIVACY_KIND_LABELS,
  privacyStatusLabel,
  privacyStatusTone,
} from "@/features/users/format";

/**
 * Data export and account deletion requests across every user, waiting ones first and oldest
 * first: kind, who asked (linked to the user when the session may open users), how long it
 * has waited, the reason, and complete or reject for a waiting request. Gated by
 * privacy.process; the new status comes from the server when the page re-reads it.
 */
export function PrivacyQueueTable({
  rows,
  filters,
  permissions,
}: {
  rows: readonly PrivacyQueueItem[];
  filters: PrivacyFilters;
  permissions: readonly string[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={filters.page > 1 ? "No requests on this page" : "No privacy requests match"}
        description={
          filters.page > 1
            ? "The queue has fewer pages than that. Go back to the first page."
            : hasPrivacyFilters(filters)
              ? "Clear a filter to see the other requests."
              : "No user has asked for a data export or an account deletion yet."
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-tile">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Request</TableHead>
            <TableHead scope="col">User</TableHead>
            <TableHead scope="col">Requested</TableHead>
            <TableHead scope="col">Reason</TableHead>
            <TableHead scope="col">Process</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const kindLabel = PRIVACY_KIND_LABELS[row.kind];
            const open = !PRIVACY_FINAL_STATUSES.includes(row.status);
            const userHref = permittedHref(permissions, `/users/${row.user_id}`);
            const name = row.user_name || "Unnamed";
            return (
              <TableRow key={row.id} className="align-top">
                <TableCell>
                  <span className="flex flex-col items-start gap-1">
                    <span className="font-medium">{kindLabel}</span>
                    <Badge variant="outline" className={privacyStatusTone(row.status)}>
                      {privacyStatusLabel(row.status)}
                    </Badge>
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex flex-col">
                    {userHref ? (
                      <Link
                        href={userHref}
                        className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="font-medium">{name}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{row.user_email ?? "No email"}</span>
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="flex flex-col">
                    <time dateTime={row.created_at}>{formatDateTime(row.created_at)}</time>
                    <span className="text-xs text-muted-foreground">
                      {row.waiting
                        ? `Waiting ${row.waiting}`
                        : row.resolved_at
                          ? `Processed ${formatDateTime(row.resolved_at)}`
                          : "Processed"}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal">
                  {row.reason ? row.reason : <span className="text-muted-foreground">None given</span>}
                  {row.resolution_note ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Note to the user: {row.resolution_note}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {open ? (
                    <div className="flex flex-wrap gap-2">
                      <PrivacyRequestDialog requestId={row.id} kindLabel={kindLabel} outcome="completed" />
                      <PrivacyRequestDialog requestId={row.id} kindLabel={kindLabel} outcome="rejected" />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Done</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

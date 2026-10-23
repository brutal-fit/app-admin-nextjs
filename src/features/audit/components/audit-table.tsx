import Link from "next/link";
import { Filter } from "@/components/icons";
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
import { auditTarget, formatAuditDetails, hasAuditDetails } from "@/features/audit/format";
import { auditListHref, auditRowLabel, type AuditFilters } from "@/features/audit/schemas";
import type { AdminAuditListRow } from "@/types/database";

const filterLinkClass =
  "focus-ring inline-flex items-center rounded-sm p-0.5 text-muted-foreground hover:text-foreground";

/**
 * The audit log, newest first: when, who, what, on which record, and the stored detail as
 * formatted JSON behind a disclosure. Actor names and targets also filter the log. Gated by
 * audit.read; target links appear only for pages the session may open.
 */
export function AuditTable({
  rows,
  filters,
  permissions,
}: {
  rows: readonly AdminAuditListRow[];
  filters: AuditFilters;
  permissions: readonly string[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={filters.page > 1 ? "No entries on this page" : "No audit entries match"}
        description={
          filters.page > 1
            ? "The log has fewer pages than that. Go back to the first page."
            : "Every admin change through the panel is recorded here. Widen the dates or clear a filter."
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-tile">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-44">
              When
            </TableHead>
            <TableHead scope="col">Actor</TableHead>
            <TableHead scope="col">Action</TableHead>
            <TableHead scope="col">Target</TableHead>
            <TableHead scope="col">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const target = auditTarget(row, permissions);
            const actorLabel = row.actor_name || (row.actor_id ? "Unnamed admin" : "System");
            return (
              <TableRow key={row.id} className="align-top">
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  <time dateTime={row.created_at}>{formatDateTime(row.created_at)}</time>
                </TableCell>
                <TableCell>
                  {row.actor_id && row.actor_id !== filters.actorId ? (
                    <Link
                      href={auditListHref(filters, { actorId: row.actor_id })}
                      className="focus-ring rounded-sm font-medium underline-offset-4 hover:underline"
                      title="Show only this actor's entries"
                    >
                      {actorLabel}
                    </Link>
                  ) : (
                    <span className="font-medium">{actorLabel}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="flex flex-col">
                    <span>{auditRowLabel(row)}</span>
                    <span className="font-mono text-xs text-muted-foreground">{row.action}</span>
                  </span>
                </TableCell>
                <TableCell>
                  {target ? (
                    <span className="inline-flex items-center gap-1.5">
                      {target.href ? (
                        <Link
                          href={target.href}
                          className="focus-ring rounded-sm font-medium underline underline-offset-4 hover:text-primary"
                        >
                          {target.label}
                        </Link>
                      ) : (
                        <span>{target.label}</span>
                      )}
                      {row.target_id && row.target_id !== filters.targetId ? (
                        <Link
                          href={auditListHref(filters, { targetId: row.target_id })}
                          className={filterLinkClass}
                          title="Show only entries on this target"
                        >
                          <Filter size={14} aria-hidden="true" />
                          <span className="sr-only">Show only entries on {target.label}</span>
                        </Link>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell className="max-w-md">
                  {hasAuditDetails(row.details) ? (
                    <details className="group">
                      <summary className="focus-ring cursor-pointer rounded-sm text-sm text-muted-foreground hover:text-foreground">
                        Show detail
                      </summary>
                      <pre className="mt-2 max-h-72 overflow-auto rounded-md border bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
                        {formatAuditDetails(row.details)}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-muted-foreground">None</span>
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

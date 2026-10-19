import Link from "next/link";
import { FileText } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ApplicationListItem } from "@/features/applications/api";
import { applicationStatusTone, formatDateTime } from "@/features/applications/format";
import {
  APPLICATION_FILTERS,
  APPLICATION_STATUS_LABELS,
  FILTER_LABELS,
  MODE_LABELS,
  type ApplicationFilter,
} from "@/features/applications/schemas";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Status filter chips plus the list of applications. Gated by applications.read. */
export function ApplicationTable({
  rows,
  filter,
  usernamesVisible,
  truncated = false,
}: {
  rows: ApplicationListItem[];
  filter: ApplicationFilter;
  usernamesVisible: boolean;
  truncated?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filter by status">
        <ul className="flex flex-wrap gap-2">
          {APPLICATION_FILTERS.map((option) => {
            const active = option === filter;
            return (
              <li key={option}>
                <Link
                  href={option === "all" ? "/applications" : `/applications?status=${option}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-sm transition-colors",
                    focusRing,
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {FILTER_LABELS[option]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No applications"
          description={
            filter === "all"
              ? "No trainer has submitted an application yet."
              : `No applications are ${FILTER_LABELS[filter].toLowerCase()} right now.`
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableCaption className="sr-only">Trainer applications</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Username</TableHead>
                <TableHead className="px-4">City</TableHead>
                <TableHead className="px-4">Modes</TableHead>
                <TableHead className="px-4">Submitted</TableHead>
                <TableHead className="px-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.trainerId}>
                  <TableCell className="px-4">
                    <Link
                      href={`/applications/${row.trainerId}`}
                      className={cn("font-medium underline-offset-4 hover:underline", focusRing)}
                    >
                      {row.fullName || "Unnamed"}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4">
                    {row.username ? (
                      `@${row.username}`
                    ) : (
                      <span className="text-muted-foreground">
                        {row.username === undefined ? "Hidden" : "None"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4">{row.city}</TableCell>
                  <TableCell className="px-4">
                    {row.modes.length === 0
                      ? "None"
                      : row.modes.map((mode) => MODE_LABELS[mode]).join(", ")}
                  </TableCell>
                  <TableCell className="px-4">{formatDateTime(row.submittedAt)}</TableCell>
                  <TableCell className="px-4">
                    <Badge variant="outline" className={applicationStatusTone(row.status)}>
                      {APPLICATION_STATUS_LABELS[row.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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

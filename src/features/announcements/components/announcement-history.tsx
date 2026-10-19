import Link from "next/link";
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
import { describeSegment } from "@/features/announcements/format";
import { appRouteLabel, peopleCount } from "@/features/announcements/schemas";
import { excerpt, permittedHref } from "@/features/support/format";
import { can } from "@/lib/rbac/can";
import type { AnnouncementRow } from "@/types/database";

/**
 * Sent announcements, newest first: when, what, to whom, the screen it opens, who sent it and
 * how many received it (the server's count). Gated by announcements.send.
 */
export function AnnouncementHistory({
  rows,
  names,
  permissions,
}: {
  rows: readonly AnnouncementRow[];
  names: Readonly<Record<string, string>>;
  permissions: readonly string[];
}) {
  const canReadUsers = can(permissions, "users.read");
  if (rows.length === 0) {
    return <EmptyState title="Nothing sent yet" description="Sent announcements show here with their counts." />;
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-tile">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sent</TableHead>
            <TableHead>Announcement</TableHead>
            <TableHead>Audience</TableHead>
            <TableHead>Opens</TableHead>
            <TableHead>Sent by</TableHead>
            <TableHead className="text-right">Recipients</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const audience = describeSegment(row.segment, names);
            const audienceHref = audience.userId ? permittedHref(permissions, `/users/${audience.userId}`) : null;
            const senderHref = permittedHref(permissions, `/users/${row.sent_by}`);
            const sender = names[row.sent_by];
            return (
              <TableRow key={row.id}>
                <TableCell className="align-top whitespace-nowrap">
                  {formatDateTime(row.sent_at ?? row.created_at)}
                </TableCell>
                <TableCell className="max-w-sm align-top whitespace-normal">
                  <span className="font-medium">{row.title}</span>
                  <span className="block text-xs text-muted-foreground">{excerpt(row.body, 120)}</span>
                </TableCell>
                <TableCell className="align-top">
                  {audienceHref ? (
                    <Link href={audienceHref} className="focus-ring rounded-sm underline-offset-4 hover:underline">
                      {audience.label}
                    </Link>
                  ) : (
                    audience.label
                  )}
                </TableCell>
                <TableCell className="align-top">
                  {row.route ? (
                    <span className="flex flex-col">
                      <span>{appRouteLabel(row.route) ?? row.route}</span>
                      <span className="font-mono text-xs text-muted-foreground">{row.route}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Inbox only</span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  {sender && senderHref ? (
                    <Link href={senderHref} className="focus-ring rounded-sm underline-offset-4 hover:underline">
                      {sender}
                    </Link>
                  ) : (
                    (sender ?? (
                      <span className="text-muted-foreground">
                        {canReadUsers ? "Unknown" : "Needs users.read"}
                      </span>
                    ))
                  )}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {row.recipient_count === null ? "Not sent" : peopleCount(row.recipient_count)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

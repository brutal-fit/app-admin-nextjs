import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCount } from "@/features/analytics/format";
import { platformLabel } from "@/features/analytics/usage/format";
import type { UsageVersionRow } from "@/lib/db/usage";

/** App version by platform, newest version first as the server orders them; the latest is marked. */
export function VersionsTable({
  versions,
  latest,
}: {
  versions: readonly UsageVersionRow[];
  latest: string | null;
}) {
  return (
    <Table>
      <TableCaption className="sr-only">Users and sessions by app version and platform</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Version</TableHead>
          <TableHead scope="col">Platform</TableHead>
          <TableHead scope="col" className="text-right">
            Users
          </TableHead>
          <TableHead scope="col" className="text-right">
            Sessions
          </TableHead>
          <TableHead scope="col" className="text-right">
            Events
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versions.map((row) => (
          <TableRow key={`${row.app_version}-${row.platform}`}>
            <TableHead scope="row" className="font-normal text-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="font-mono text-xs">{row.app_version}</span>
                {row.app_version === latest ? (
                  <Badge variant="outline" className="border-success text-success">
                    Latest
                  </Badge>
                ) : null}
              </span>
            </TableHead>
            <TableCell>{platformLabel(row.platform)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(row.users)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(row.sessions)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(row.events)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCount, formatShare } from "@/features/analytics/format";
import {
  RETENTION_OFFSETS,
  cohortLabel,
  retentionCell,
  retentionShade,
} from "@/features/analytics/usage/format";
import type { RetentionCohort } from "@/lib/db/usage";

/**
 * Weekly retention cohorts: one row per week of first use, W+1 to W+6 across, each cell the
 * share of that cohort active in the week, shaded by share with the first chart colour. A
 * week that has not begun reads "Not yet". Every cell carries its number, so the shading only
 * repeats what the text says.
 */
export function RetentionGrid({ cohorts }: { cohorts: readonly RetentionCohort[] }) {
  return (
    <Table>
      <TableCaption className="sr-only">
        Weekly retention: share of each cohort active in the weeks after its first week
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Cohort</TableHead>
          <TableHead scope="col" className="text-right">
            Users
          </TableHead>
          {RETENTION_OFFSETS.map((offset) => (
            <TableHead key={offset} scope="col" className="text-right">
              W+{offset}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {cohorts.map((cohort) => (
          <TableRow key={cohort.week}>
            <TableHead scope="row" className="font-normal whitespace-nowrap text-foreground">
              {cohortLabel(cohort.week)}
            </TableHead>
            <TableCell className="text-right tabular-nums">{formatCount(cohort.users)}</TableCell>
            {RETENTION_OFFSETS.map((offset) => {
              const cell = retentionCell(cohort, offset);
              const share = cell?.share ?? null;
              const shade = retentionShade(share);
              return (
                <TableCell
                  key={offset}
                  data-shade={shade ?? "none"}
                  className="text-right tabular-nums"
                  style={
                    shade
                      ? { backgroundColor: `color-mix(in srgb, var(--chart-1) ${shade}%, transparent)` }
                      : undefined
                  }
                  title={
                    share === null
                      ? undefined
                      : `${formatCount(cell?.users ?? 0)} of ${formatCount(cohort.users)} users`
                  }
                >
                  {share === null ? (
                    <span className="text-muted-foreground">Not yet</span>
                  ) : (
                    formatShare(share)
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

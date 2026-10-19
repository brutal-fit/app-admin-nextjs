import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * The numbers behind a chart as a plain table: the first column names the row, the rest are
 * right-aligned values. Rendered under each chart behind its "Show data table" button.
 */
export function MetricTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly { key: string; cells: readonly string[] }[];
}) {
  return (
    <Table>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead key={column} scope="col" className={index > 0 ? "text-right" : undefined}>
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            {row.cells.map((cell, index) =>
              index === 0 ? (
                <TableHead key={index} scope="row" className="font-normal text-foreground">
                  {cell}
                </TableHead>
              ) : (
                <TableCell key={index} className="text-right tabular-nums">
                  {cell}
                </TableCell>
              ),
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

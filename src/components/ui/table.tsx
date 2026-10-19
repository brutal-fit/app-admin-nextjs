import type { ReactNode } from "react";

export type TableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  className?: string;
};

export function Table<Row>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
}: {
  caption: string;
  columns: TableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border last:border-b-0">
              {columns.map((column) => (
                <td key={column.key} className={column.className ?? "px-4 py-3 align-top"}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

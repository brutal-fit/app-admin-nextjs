"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "@/components/icons";
import { Button } from "@/components/ui/button";

/**
 * One analytics section: title, what the numbers mean, the chart, and a button that shows
 * the same numbers as a table (for screen readers, exact values and copying). An empty
 * section says so instead of drawing an empty chart.
 */
export function ChartCard({
  title,
  description,
  empty,
  chart,
  table,
}: {
  title: string;
  description: string;
  /** Shown instead of the chart and table when the range has no data for this section. */
  empty: string | null;
  chart: ReactNode;
  table: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const headingId = useId();
  const tableId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 shadow-tile"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={headingId} className="text-base font-semibold">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {empty === null ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={showTable}
            aria-controls={tableId}
            onClick={() => setShowTable((shown) => !shown)}
          >
            {showTable ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
            {showTable ? "Hide data table" : "Show data table"}
          </Button>
        ) : null}
      </div>
      {empty !== null ? (
        <p className="rounded-lg border border-dashed border-input p-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <>
          {chart}
          <div id={tableId} hidden={!showTable} className="overflow-x-auto">
            {table}
          </div>
        </>
      )}
    </section>
  );
}

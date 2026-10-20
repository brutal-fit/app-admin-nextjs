"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { formatCount, formatDuration, formatShare } from "@/features/analytics/format";
import { SCREENS_TOP, USAGE_EMPTY } from "@/features/analytics/usage/format";
import type { UsageScreen } from "@/lib/db/usage";

const COLUMNS: readonly DataTableColumn<UsageScreen>[] = [
  {
    id: "route",
    header: "Route",
    cell: (row) => <span className="font-mono text-xs">{row.route}</span>,
    sortValue: (row) => row.route,
  },
  {
    id: "views",
    header: "Views",
    cell: (row) => formatCount(row.views),
    sortValue: (row) => row.views,
    className: "text-right tabular-nums",
  },
  {
    id: "users",
    header: "Unique users",
    cell: (row) => formatCount(row.unique_users),
    sortValue: (row) => row.unique_users,
    className: "text-right tabular-nums",
  },
  {
    id: "time",
    header: "Median time on screen",
    cell: (row) => formatDuration(row.median_time_on_screen_ms),
    sortValue: (row) => row.median_time_on_screen_ms,
    className: "text-right tabular-nums",
  },
  {
    id: "share",
    header: "Share of sessions",
    cell: (row) => formatShare(row.session_share),
    sortValue: (row) => row.session_share,
    className: "text-right tabular-nums",
  },
];

/**
 * Screens by views, as the server sorts them: the top 20 until "Show all", then every route.
 * Column sorting reorders the rows shown.
 */
export function ScreensTable({ screens }: { screens: readonly UsageScreen[] }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? screens : screens.slice(0, SCREENS_TOP);
  const hidden = screens.length - rows.length;

  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      rowKey={(row) => row.route}
      caption="Screens by views"
      countLabel={(count) =>
        hidden > 0
          ? `Top ${formatCount(count)} of ${formatCount(screens.length)} routes`
          : `${formatCount(count)} ${count === 1 ? "route" : "routes"}`
      }
      empty={USAGE_EMPTY}
      toolbar={
        screens.length > SCREENS_TOP ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAll((shown) => !shown)}>
            {showAll ? `Show the top ${SCREENS_TOP}` : `Show all ${formatCount(screens.length)}`}
          </Button>
        ) : undefined
      }
    />
  );
}

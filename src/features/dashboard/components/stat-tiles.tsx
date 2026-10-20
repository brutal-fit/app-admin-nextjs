import Link from "next/link";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  BarChart2,
  Calendar,
  Clock,
  FileText,
  Flag,
  LifeBuoy,
  UserPlus,
  Users,
  type Icon,
} from "@/components/icons";
import { CountUp } from "@/components/motion/count-up";
import { StaggerItem, StaggerList } from "@/components/motion/stagger-list";
import { cn } from "@/lib/utils";
import type { DashboardTile, TileId } from "@/features/dashboard/api";

const TILE_ICONS: Record<TileId, Icon> = {
  safety: AlertCircle,
  applications: Users,
  documents: FileText,
  support: LifeBuoy,
  privacy: Archive,
  "bookings-today": Calendar,
  "booking-requests": Clock,
  "reported-reviews": Flag,
  "new-users": UserPlus,
  "active-users": BarChart2,
};

function TileBody({ tile }: { tile: DashboardTile }) {
  const TileIcon = TILE_ICONS[tile.id];
  const { value } = tile;
  const attention = tile.urgent && value.kind === "count" && value.value > 0;
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {tile.label}
        </p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border",
            attention ? "border-primary/40 text-primary" : "text-muted-foreground",
          )}
        >
          <TileIcon size={16} aria-hidden="true" />
        </span>
      </div>
      {value.kind === "count" ? (
        <div className="flex items-baseline gap-2">
          <CountUp
            value={value.value}
            suffix={value.capped ? "+" : ""}
            className="text-4xl font-bold tracking-tight"
          />
          {attention ? (
            <span className="text-xs font-semibold text-warning">Needs attention</span>
          ) : null}
        </div>
      ) : value.kind === "hidden" ? (
        <p className="text-sm text-muted-foreground">{value.reason}</p>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {value.message}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {value.kind === "count" && value.detail ? value.detail : tile.hint}
      </p>
      <div className="mt-auto pt-1 text-sm">
        {tile.href && value.kind === "count" ? (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            Open the list
            <ArrowRight
              size={14}
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        ) : tile.linkNote && value.kind === "count" ? (
          <span className="text-xs text-muted-foreground">{tile.linkNote}</span>
        ) : null}
      </div>
    </>
  );
}

const tileClass =
  "group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 shadow-tile transition-[background-color,box-shadow,translate] duration-200";

/**
 * The "needs me now" tiles. A tile with a readable count and a page links there with the
 * filter applied; the rest explain what they need or why they have no link.
 */
export function StatTiles({ tiles }: { tiles: DashboardTile[] }) {
  return (
    <StaggerList>
      <ul aria-label="Needs me now" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile, index) => (
          <StaggerItem key={tile.id} index={index} className="min-w-0">
            {tile.href && tile.value.kind === "count" ? (
              <Link
                href={tile.href}
                data-tile={tile.id}
                className={cn(
                  tileClass,
                  "focus-ring hover:-translate-y-0.5 hover:bg-surface-raised hover:shadow-tile-hover",
                )}
              >
                <TileBody tile={tile} />
              </Link>
            ) : (
              <div data-tile={tile.id} className={tileClass}>
                <TileBody tile={tile} />
              </div>
            )}
          </StaggerItem>
        ))}
      </ul>
    </StaggerList>
  );
}

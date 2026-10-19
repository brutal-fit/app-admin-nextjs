import { CountUp } from "@/components/motion/count-up";
import { StaggerItem, StaggerList } from "@/components/motion/stagger-list";

export type MetricTile = {
  id: string;
  label: string;
  /** A whole number counts up; text (rates with no data, decimals) shows as written. */
  value: { kind: "count"; value: number; suffix?: string } | { kind: "text"; text: string };
  hint: string;
};

/**
 * The headline numbers for the range. Whole numbers use the panel's CountUp, whose markup
 * always holds the real value; anything else is plain text.
 */
export function MetricTiles({ tiles }: { tiles: readonly MetricTile[] }) {
  return (
    <StaggerList>
      <ul aria-label="Headline numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile, index) => (
          <StaggerItem key={tile.id} index={index} className="min-w-0">
            <div
              data-tile={tile.id}
              className="flex h-full flex-col gap-2 rounded-xl border bg-card p-5 shadow-tile"
            >
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{tile.label}</p>
              {tile.value.kind === "count" ? (
                <CountUp
                  value={tile.value.value}
                  suffix={tile.value.suffix ?? ""}
                  className="text-3xl font-bold tracking-tight"
                />
              ) : (
                <p className="text-3xl font-bold tracking-tight">{tile.value.text}</p>
              )}
              <p className="text-xs text-muted-foreground">{tile.hint}</p>
            </div>
          </StaggerItem>
        ))}
      </ul>
    </StaggerList>
  );
}

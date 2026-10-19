import { cn } from "@/lib/utils";
import type { ChartSlot } from "@/features/analytics/format";

// Literal class names so Tailwind generates them; one per colour slot.
export const SLOT_BG: Record<ChartSlot, string> = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
};

/** Series names beside their colour; text stays in the text colour, the swatch carries identity. */
export function ChartLegend({
  items,
}: {
  items: readonly { key: string; label: string; slot: ChartSlot; total?: string }[];
}) {
  return (
    <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.key} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-2.5 rounded-sm", SLOT_BG[item.slot])} />
          <span className="text-foreground">{item.label}</span>
          {item.total !== undefined ? <span className="tabular-nums">{item.total}</span> : null}
        </li>
      ))}
    </ul>
  );
}

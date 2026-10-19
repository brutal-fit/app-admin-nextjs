import { slotColor, type BarDatum, type ChartSlot } from "@/features/analytics/format";

const WIDTH = 720;
const ROW_H = 30;
const LABEL_W = 250;
const VALUE_W = 64;
const BAR_H = 14;

/**
 * Horizontal bars, one row per item, on a shared scale from zero: the label on the left,
 * the value on the right in the text colour. A single series, so the title names it and
 * there is no legend. Each bar has a native tooltip; the data table holds the same rows.
 */
export function BarListChart({
  data,
  summary,
  max,
  slot = 1,
}: {
  data: readonly BarDatum[];
  summary: string;
  /** The value a full bar stands for; the largest value when not given. */
  max?: number;
  slot?: ChartSlot;
}) {
  const top = max ?? Math.max(1, ...data.map((item) => item.value));
  const track = WIDTH - LABEL_W - VALUE_W;
  const height = data.length * ROW_H;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={summary} className="h-auto w-full">
      {data.map((item, index) => {
        const y = index * ROW_H;
        const width = top > 0 ? Math.max(0, Math.min(1, item.value / top)) * track : 0;
        return (
          <g key={item.key}>
            <title>{`${item.label}: ${item.display}`}</title>
            <text x={0} y={y + ROW_H / 2} dy="0.32em" fontSize={12} className="fill-foreground">
              {item.label}
            </text>
            <rect
              x={LABEL_W}
              y={y + (ROW_H - BAR_H) / 2}
              width={track}
              height={BAR_H}
              rx={4}
              className="fill-muted"
            />
            {width > 0 ? (
              <rect
                x={LABEL_W}
                y={y + (ROW_H - BAR_H) / 2}
                width={Math.max(2, width)}
                height={BAR_H}
                rx={4}
                fill={slotColor(slot)}
              />
            ) : null}
            <text
              x={WIDTH}
              y={y + ROW_H / 2}
              dy="0.32em"
              textAnchor="end"
              fontSize={12}
              className="fill-foreground tabular-nums"
            >
              {item.display}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

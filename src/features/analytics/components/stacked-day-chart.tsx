"use client";

import { useState } from "react";
import { ChartLegend } from "@/features/analytics/components/chart-legend";
import { countAxis, formatCount, formatDay, slotColor, type ChartSlot } from "@/features/analytics/format";

export type DayStackSeries = { key: string; label: string; slot: ChartSlot };
/** One day: the India date and one value per series, in series order. */
export type DayStack = { day: string; values: number[] };

const WIDTH = 720;
const HEIGHT = 220;
const MARGIN = { top: 10, right: 8, bottom: 26, left: 40 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Stacked bars per day on one count axis, drawn in SVG with the chart tokens. Hovering a day
 * dims the others and reads its values out above the chart; the data table under the card
 * holds every value for keyboard and screen reader users, and the SVG carries a summary.
 */
export function StackedDayChart({
  series,
  days,
  summary,
}: {
  series: readonly DayStackSeries[];
  days: readonly DayStack[];
  /** One sentence for screen readers, such as "Sign-ups per day: 42 in 30 days". */
  summary: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const totals = days.map((day) => sum(day.values));
  const axis = countAxis(Math.max(0, ...totals));
  const band = PLOT_W / Math.max(1, days.length);
  const barWidth = Math.max(1, Math.min(24, band * 0.7));
  const y = (value: number) => MARGIN.top + PLOT_H - (value / axis.top) * PLOT_H;
  const labelIndexes = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])].filter(
    (index) => index >= 0,
  );

  const activeDay = active !== null ? days[active] : undefined;
  const seriesTotals = series.map((_, index) => sum(days.map((day) => day.values[index] ?? 0)));

  return (
    <div className="flex flex-col gap-3">
      <ChartLegend
        items={series.map((item, index) => ({
          ...item,
          total: formatCount(seriesTotals[index] ?? 0),
        }))}
      />
      <p className="min-h-5 text-xs text-muted-foreground" aria-hidden="true">
        {activeDay ? (
          <>
            <span className="font-medium text-foreground">{formatDay(activeDay.day)}</span>
            {": "}
            {formatCount(sum(activeDay.values))} total.{" "}
            {series.map((item, index) => `${item.label} ${formatCount(activeDay.values[index] ?? 0)}`).join(", ")}
          </>
        ) : (
          "Point at a day for its numbers."
        )}
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={summary}
        className="h-auto w-full"
        onPointerLeave={() => setActive(null)}
      >
        {axis.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
              className={tick === 0 ? "stroke-input" : "stroke-chart-grid"}
              strokeWidth={1}
            />
            <text
              x={MARGIN.left - 6}
              y={y(tick)}
              dy="0.32em"
              textAnchor="end"
              fontSize={11}
              className="fill-muted-foreground tabular-nums"
            >
              {formatCount(tick)}
            </text>
          </g>
        ))}

        {days.map((day, dayIndex) => {
          const x = MARGIN.left + dayIndex * band + (band - barWidth) / 2;
          let base = 0;
          const dimmed = active !== null && active !== dayIndex;
          return (
            <g key={day.day} opacity={dimmed ? 0.4 : 1}>
              {series.map((item, index) => {
                const value = day.values[index] ?? 0;
                if (value <= 0) return null;
                const top = y(base + value);
                const bottom = y(base);
                base += value;
                return (
                  <rect
                    key={item.key}
                    x={x}
                    y={top}
                    width={barWidth}
                    height={Math.max(0, bottom - top)}
                    fill={slotColor(item.slot)}
                    // The card colour as an outline leaves a gap between stacked segments.
                    className="stroke-card"
                    strokeWidth={1}
                  />
                );
              })}
            </g>
          );
        })}

        {labelIndexes.map((index) => {
          const day = days[index];
          if (!day) return null;
          const anchor = index === 0 ? "start" : index === days.length - 1 ? "end" : "middle";
          const x =
            anchor === "start"
              ? MARGIN.left + index * band
              : anchor === "end"
                ? MARGIN.left + (index + 1) * band
                : MARGIN.left + index * band + band / 2;
          return (
            <text
              key={day.day}
              x={x}
              y={HEIGHT - 8}
              textAnchor={anchor}
              fontSize={11}
              className="fill-muted-foreground"
            >
              {formatDay(day.day)}
            </text>
          );
        })}

        {/* Hit areas: the full column of each day, wider than the bar. */}
        {days.map((day, dayIndex) => (
          <rect
            key={`hit-${day.day}`}
            x={MARGIN.left + dayIndex * band}
            y={MARGIN.top}
            width={band}
            height={PLOT_H}
            fill="transparent"
            onPointerEnter={() => setActive(dayIndex)}
          />
        ))}
      </svg>
    </div>
  );
}

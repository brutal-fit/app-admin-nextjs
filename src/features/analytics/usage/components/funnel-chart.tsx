import { formatCount, formatShare } from "@/features/analytics/format";
import {
  FUNNEL_MODE_LABELS,
  funnelBars,
  overallConversion,
} from "@/features/analytics/usage/format";
import type { FunnelGroup } from "@/lib/db/usage";

/**
 * One funnel (a role and a mode): four bars from discovery to a confirmed booking, each as
 * long as its share of the first step, with the conversion from the step before. A list, so
 * screen readers hear every step and number in order.
 */
export function FunnelChart({ group }: { group: FunnelGroup }) {
  const bars = funnelBars(group);
  const overall = overallConversion(group);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">{FUNNEL_MODE_LABELS[group.mode]}</h4>
        <p className="text-xs text-muted-foreground">
          Overall <span className="text-foreground tabular-nums">{formatShare(overall)}</span>
        </p>
      </div>
      <ol className="flex flex-col gap-2.5">
        {bars.map((bar, index) => (
          <li key={bar.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-foreground">{bar.label}</span>
              <span className="tabular-nums text-foreground">{formatCount(bar.users)}</span>
            </div>
            <div className="h-3 w-full rounded bg-muted" aria-hidden="true">
              {bar.width > 0 ? (
                <div
                  className="h-3 rounded bg-chart-1"
                  style={{ width: `${Math.max(1, bar.width * 100)}%` }}
                />
              ) : null}
            </div>
            {index > 0 ? (
              <p className="text-xs text-muted-foreground">
                {bar.conversion === null
                  ? "No conversion: the step before is empty."
                  : `${formatShare(bar.conversion)} of the step before`}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

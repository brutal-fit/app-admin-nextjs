import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ANALYTICS_TAB_LABELS,
  analyticsHref,
  rangeHrefInput,
  type AnalyticsRange,
  type AnalyticsTab,
} from "@/features/analytics/schemas";

/**
 * The analytics views as links (the tab lives in the URL, `?tab=usage`), each keeping the
 * range. The page renders this only when the session can open more than one tab.
 */
export function AnalyticsTabs({
  tabs,
  active,
  range,
}: {
  tabs: readonly AnalyticsTab[];
  active: AnalyticsTab;
  range: AnalyticsRange;
}) {
  return (
    <nav aria-label="Analytics views" className="border-b">
      <ul className="-mb-px flex gap-1">
        {tabs.map((tab) => {
          const current = tab === active;
          return (
            <li key={tab}>
              <Link
                href={analyticsHref(rangeHrefInput(range), tab)}
                aria-current={current ? "page" : undefined}
                data-tab={tab}
                className={cn(
                  "focus-ring inline-flex items-center rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  current
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {ANALYTICS_TAB_LABELS[tab]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

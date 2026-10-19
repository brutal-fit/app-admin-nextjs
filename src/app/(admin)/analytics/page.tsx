import { PageHeader } from "@/components/layout/page-header";
import { loadMetrics } from "@/features/analytics/api";
import { AnalyticsReport } from "@/features/analytics/components/analytics-report";
import { RangePicker } from "@/features/analytics/components/range-picker";
import { analyticsHref, parseAnalyticsRange } from "@/features/analytics/schemas";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { istDateString } from "@/lib/utils/time";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRoutePermission("/analytics");
  const today = istDateString();
  const range = parseAnalyticsRange(await searchParams, today);
  const supabase = await createSupabaseServerClient();
  const result = await loadMetrics(supabase, range);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Analytics"
        title="Analytics"
        description="The platform's numbers for a date range, read live in one call. Dates are India days and include both ends."
      />
      {/* Keyed on the range so the date inputs start from it after navigation. */}
      <RangePicker key={analyticsHref({ from: range.from, to: range.to })} range={range} today={today} />
      {result.ok ? (
        <AnalyticsReport metrics={result.metrics} />
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}

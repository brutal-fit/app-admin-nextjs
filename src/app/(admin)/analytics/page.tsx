import { PageHeader } from "@/components/layout/page-header";
import { loadMetrics } from "@/features/analytics/api";
import { AnalyticsReport } from "@/features/analytics/components/analytics-report";
import { AnalyticsTabs } from "@/features/analytics/components/analytics-tabs";
import { RangePicker } from "@/features/analytics/components/range-picker";
import {
  analyticsHref,
  analyticsTabs,
  parseAnalyticsRange,
  parseAnalyticsTab,
  type AnalyticsRange,
} from "@/features/analytics/schemas";
import { loadUsage } from "@/features/analytics/usage/api";
import { UsageReport } from "@/features/analytics/usage/components/usage-report";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { istDateString } from "@/lib/utils/time";

function ErrorLine({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

async function BusinessTab({ range }: { range: AnalyticsRange }) {
  const supabase = await createSupabaseServerClient();
  const result = await loadMetrics(supabase, range);
  return result.ok ? <AnalyticsReport metrics={result.metrics} /> : <ErrorLine message={result.error} />;
}

async function UsageTab({ range, today }: { range: AnalyticsRange; today: string }) {
  const supabase = await createSupabaseServerClient();
  const result = await loadUsage(supabase, range);
  return result.ok ? <UsageReport usage={result.usage} today={today} /> : <ErrorLine message={result.error} />;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireRoutePermission("/analytics");
  // The Usage tab needs analytics.read on top of the page's metrics.read; without it the
  // page is the business report alone and ?tab=usage falls back to it.
  const canReadUsage = can(access.permissions, "analytics.read");
  const params = await searchParams;
  const today = istDateString();
  const range = parseAnalyticsRange(params, today);
  const tab = parseAnalyticsTab(params, canReadUsage);
  const tabs = analyticsTabs(canReadUsage);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Analytics"
        title="Analytics"
        description={
          tab === "usage"
            ? "How people use the app over a date range, read live from the usage aggregates. Dates are India days and include both ends."
            : "The platform's numbers for a date range, read live in one call. Dates are India days and include both ends."
        }
      />
      {tabs.length > 1 ? <AnalyticsTabs tabs={tabs} active={tab} range={range} /> : null}
      {/* Keyed on the range so the date inputs start from it after navigation. */}
      <RangePicker key={analyticsHref({ from: range.from, to: range.to })} range={range} today={today} tab={tab} />
      {tab === "usage" ? <UsageTab range={range} today={today} /> : <BusinessTab range={range} />}
    </div>
  );
}

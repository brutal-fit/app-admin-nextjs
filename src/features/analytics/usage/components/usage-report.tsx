import type { ReactNode } from "react";
import { BarListChart } from "@/features/analytics/components/bar-list-chart";
import { ChartCard } from "@/features/analytics/components/chart-card";
import { MetricTable } from "@/features/analytics/components/metric-table";
import { MetricTiles, type MetricTile } from "@/features/analytics/components/metric-tiles";
import { StackedDayChart } from "@/features/analytics/components/stacked-day-chart";
import {
  formatCount,
  formatDay,
  formatDuration,
  formatLongDay,
  formatShare,
} from "@/features/analytics/format";
import type { UsageData } from "@/features/analytics/usage/api";
import { EventDayChart } from "@/features/analytics/usage/components/event-day-chart";
import { FunnelChart } from "@/features/analytics/usage/components/funnel-chart";
import { RetentionGrid } from "@/features/analytics/usage/components/retention-grid";
import { ScreensTable } from "@/features/analytics/usage/components/screens-table";
import { VersionsTable } from "@/features/analytics/usage/components/versions-table";
import {
  ACTIVE_USER_SERIES,
  FUNNEL_MODE_LABELS,
  FUNNEL_STEP_LABELS,
  RETENTION_OFFSETS,
  USAGE_EMPTY,
  activeEventNames,
  cohortLabel,
  eventBars,
  eventLabel,
  formatMonth,
  funnelByRole,
  isEmptyUsage,
  latestMonth,
  overallConversion,
  retentionCell,
  roleLabel,
  todayActiveUsers,
} from "@/features/analytics/usage/format";
import { FUNNEL_STEPS } from "@/lib/db/usage";

function tilesFor(usage: UsageData, today: string): MetricTile[] {
  const { overview, versions } = usage;
  const todayUsers = todayActiveUsers(overview, today);
  const month = latestMonth(overview);
  const returning = Math.max(0, overview.totals.active_users - overview.totals.new_users);
  const length = overview.session_length;
  return [
    {
      id: "active-today",
      label: "Active users today",
      value: todayUsers === null ? { kind: "text", text: "Not in range" } : { kind: "count", value: todayUsers },
      hint:
        todayUsers === null
          ? "The range ends before today. Pick a range that includes today."
          : "Signed-in people with at least one event today, India time.",
    },
    {
      id: "active-range",
      label: "Active users",
      value: { kind: "count", value: overview.totals.active_users },
      hint: "Signed-in people with at least one event in the range.",
    },
    {
      id: "sessions",
      label: "Sessions",
      value: { kind: "count", value: overview.totals.sessions },
      hint: "App runs in the foreground; 30 minutes in the background starts a new one.",
    },
    {
      id: "session-length",
      label: "Median session",
      value: { kind: "text", text: formatDuration(length.median_ms) },
      hint:
        length.count === 0
          ? "No ended sessions in the range yet."
          : `p90 ${formatDuration(length.p90_ms)} over ${formatCount(length.count)} ended sessions (m:ss).`,
    },
    {
      id: "new-users",
      label: "New users",
      value: { kind: "count", value: overview.totals.new_users },
      hint: "Their first event ever fell in this range.",
    },
    {
      id: "returning-users",
      label: "Returning users",
      value: { kind: "count", value: returning },
      hint: "Active in the range and first seen before it.",
    },
    {
      id: "monthly-active",
      label: "Monthly active users",
      value: month ? { kind: "count", value: month.active_users } : { kind: "text", text: "No data" },
      hint: month ? `${formatMonth(month.month)}, the whole calendar month.` : "No month in this range.",
    },
    {
      id: "latest-version",
      label: "On the latest version",
      value: { kind: "text", text: formatShare(versions.latest_share) },
      hint:
        versions.latest_version === null
          ? "No app version seen in this range."
          : `${formatCount(versions.users_on_latest)} of ${formatCount(versions.users)} users on ${versions.latest_version} at their last event.`,
    },
  ];
}

/** A titled card for a section that is its own table (no chart and data table toggle). */
function Panel({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 shadow-tile">
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyNote() {
  return <p className="rounded-lg border border-dashed border-input p-4 text-sm text-muted-foreground">{USAGE_EMPTY}</p>;
}

/**
 * The Usage tab for one range: headline tiles, daily active users new and returning, weekly
 * retention, screens, the booking funnel per role and mode, events and app versions. Every
 * number comes from the five admin_usage_* answers; empty sections say so.
 */
export function UsageReport({ usage, today }: { usage: UsageData; today: string }) {
  const { overview, screens, funnel, events, versions } = usage;
  const days = `${formatCount(overview.range.days)} ${overview.range.days === 1 ? "day" : "days"}`;
  const empty = isEmptyUsage(overview, events);
  const bars = eventBars(events);
  const names = activeEventNames(events);
  const roles = funnelByRole(funnel.funnel);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {formatLongDay(overview.range.from)} to {formatLongDay(overview.range.to)}, {days}, India time.
        Signed-in app use only; people who turned off usage sharing are not counted.
      </p>
      {empty ? (
        <p role="status" className="rounded-lg border border-dashed border-input p-4 text-sm text-muted-foreground">
          {USAGE_EMPTY}
        </p>
      ) : null}

      <MetricTiles tiles={tilesFor(usage, today)} />

      <ChartCard
        title="Daily active users, new and returning"
        description="People with at least one event each day. New means their first event ever was that day. Days kept only as a daily rollup (raw events older than 180 days) have no split."
        empty={overview.daily.every((row) => row.active_users === 0) ? USAGE_EMPTY : null}
        chart={
          <StackedDayChart
            series={ACTIVE_USER_SERIES.map(({ key, label, slot }) => ({ key, label, slot }))}
            days={overview.daily.map((row) => ({ day: row.day, values: ACTIVE_USER_SERIES.map((s) => s.value(row)) }))}
            summary={`Daily active users: ${formatCount(overview.totals.active_users)} people in ${days}.`}
          />
        }
        table={
          <MetricTable
            caption="Daily active users, new and returning, and sessions"
            columns={["Day", "Active", "New", "Returning", "Sessions"]}
            rows={overview.daily.map((row) => ({
              key: row.day,
              cells: [
                formatDay(row.day),
                formatCount(row.active_users),
                row.new_users === null ? "Not split" : formatCount(row.new_users),
                row.returning_users === null ? "Not split" : formatCount(row.returning_users),
                formatCount(row.sessions),
              ],
            }))}
          />
        }
      />

      <ChartCard
        title="Weekly retention"
        description="People grouped by the week (Monday to Sunday) of their first event, and the share of each group active in each following week."
        empty={overview.retention_cohorts.length === 0 ? USAGE_EMPTY : null}
        chart={
          <div className="overflow-x-auto">
            <RetentionGrid cohorts={overview.retention_cohorts} />
          </div>
        }
        table={
          <MetricTable
            caption="Weekly retention as counts of people"
            columns={["Cohort", "Users", ...RETENTION_OFFSETS.map((offset) => `W+${offset}`)]}
            rows={overview.retention_cohorts.map((cohort) => ({
              key: cohort.week,
              cells: [
                cohortLabel(cohort.week),
                formatCount(cohort.users),
                ...RETENTION_OFFSETS.map((offset) => {
                  const users = retentionCell(cohort, offset)?.users ?? null;
                  return users === null ? "Not yet" : formatCount(users);
                }),
              ],
            }))}
          />
        }
      />

      <Panel
        id="usage-screens"
        title="Screens"
        description={`Screen views by route, ${formatCount(screens.sessions)} sessions in the range. Time on screen is the median of the views that reported it (m:ss).`}
      >
        {screens.screens.length === 0 ? <EmptyNote /> : <ScreensTable screens={screens.screens} />}
      </Panel>

      <ChartCard
        title="Booking funnel"
        description="People who searched or browsed trainers, then viewed one, requested a booking and had it confirmed, by role and mode. Each step counts only people who reached the one before."
        empty={funnel.funnel.length === 0 ? USAGE_EMPTY : null}
        chart={
          <div className="flex flex-col gap-6">
            {roles.map((entry) => (
              <div key={entry.role} className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">{roleLabel(entry.role)}</h3>
                <div className="grid gap-6 md:grid-cols-3">
                  {entry.groups.map((group) => (
                    <FunnelChart key={`${group.role}-${group.mode}`} group={group} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        }
        table={
          <MetricTable
            caption="Booking funnel by role and mode"
            columns={["Role and mode", ...FUNNEL_STEPS.map((step) => FUNNEL_STEP_LABELS[step]), "Overall"]}
            rows={funnel.funnel.map((group) => ({
              key: `${group.role}-${group.mode}`,
              cells: [
                `${roleLabel(group.role)}, ${FUNNEL_MODE_LABELS[group.mode].toLowerCase()}`,
                ...FUNNEL_STEPS.map((step) => formatCount(group.steps.find((s) => s.step === step)?.users ?? 0)),
                formatShare(overallConversion(group)),
              ],
            }))}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Events"
          description="Every event in the range by name, with how many people sent it. Unique people come from raw events, the last 180 days."
          empty={bars.length === 0 ? USAGE_EMPTY : null}
          chart={<BarListChart data={bars} summary={bars.map((item) => `${item.label} ${item.display}`).join(", ")} />}
          table={
            <MetricTable
              caption="Events by name"
              columns={["Event", "Events", "Unique users"]}
              rows={events.by_name.map((row) => ({
                key: row.name,
                cells: [eventLabel(row.name), formatCount(row.events), formatCount(row.users)],
              }))}
            />
          }
        />

        <ChartCard
          title="Events per day"
          description="One event, or all of them, per India day."
          empty={names.length === 0 ? USAGE_EMPTY : null}
          chart={<EventDayChart events={events} names={names} />}
          table={
            <MetricTable
              caption="Events per day by name"
              columns={["Day", ...names.map((name) => eventLabel(name)), "Total"]}
              rows={events.by_day.map((row) => ({
                key: row.day,
                cells: [
                  formatDay(row.day),
                  ...names.map((name) => formatCount(row.by_name[name] ?? 0)),
                  formatCount(row.total),
                ],
              }))}
            />
          }
        />
      </div>

      <Panel
        id="usage-versions"
        title="App versions"
        description="People, sessions and events by app version and platform in the range, newest version first."
      >
        {versions.versions.length === 0 ? (
          <EmptyNote />
        ) : (
          <div className="overflow-x-auto">
            <VersionsTable versions={versions.versions} latest={versions.latest_version} />
          </div>
        )}
      </Panel>
    </div>
  );
}

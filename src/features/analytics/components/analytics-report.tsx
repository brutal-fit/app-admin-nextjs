import { BarListChart } from "@/features/analytics/components/bar-list-chart";
import { ChartCard } from "@/features/analytics/components/chart-card";
import { MetricTable } from "@/features/analytics/components/metric-table";
import { MetricTiles, type MetricTile } from "@/features/analytics/components/metric-tiles";
import { StackedDayChart } from "@/features/analytics/components/stacked-day-chart";
import {
  BOOKING_SERIES,
  SIGNUP_SERIES,
  applicationFunnel,
  applicationStatusRows,
  bookingStatusCount,
  cityBars,
  formatCount,
  formatDay,
  formatDays,
  formatHours,
  formatLongDay,
  formatPercent,
  formatRatingAverage,
  isEmptyRange,
  rateBars,
} from "@/features/analytics/format";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_ORDER } from "@/features/users/format";
import type { PlatformMetrics } from "@/lib/db/metrics";

function rateTile(id: string, label: string, rate: number | null, hint: string): MetricTile {
  return {
    id,
    label,
    value: rate === null ? { kind: "text", text: "No data" } : { kind: "count", value: Math.round(rate * 100), suffix: "%" },
    hint,
  };
}

function tilesFor(m: PlatformMetrics): MetricTile[] {
  const settled = `Of ${formatCount(m.bookings.settled)} settled bookings (completed, no-show, cancelled, disputed).`;
  return [
    {
      id: "signups",
      label: "Sign-ups",
      value: { kind: "count", value: m.signups.total },
      hint: `${formatCount(m.signups.by_role.client)} clients, ${formatCount(m.signups.by_role.trainer)} trainers, ${formatCount(m.signups.by_role.none)} without a role yet.`,
    },
    {
      id: "bookings",
      label: "Bookings",
      value: { kind: "count", value: m.bookings.total },
      hint: `By session day: ${formatCount(m.bookings.by_mode.home)} at home, ${formatCount(m.bookings.by_mode.online)} online.`,
    },
    rateTile("completion", "Completion rate", m.bookings.completion_rate, settled),
    rateTile("cancellation", "Cancellation rate", m.bookings.cancellation_rate, settled),
    {
      id: "active-trainers",
      label: "Active trainers",
      value: { kind: "count", value: m.trainers.active },
      hint: `With a confirmed or later session in the range; ${formatCount(m.trainers.listed)} listed now.`,
    },
    {
      id: "active-clients",
      label: "Active clients",
      value: { kind: "count", value: m.clients.active },
      hint: `With a confirmed or later session; ${formatCount(m.clients.booked)} booked anything.`,
    },
    {
      id: "applications",
      label: "Applications submitted",
      value: { kind: "count", value: m.applications.submitted },
      hint: `${formatCount(m.applications.decided)} decided, approval ${formatPercent(m.applications.approval_rate).toLowerCase()}, median ${formatDays(m.applications.median_days_to_decision).toLowerCase()} to decide.`,
    },
    {
      id: "reviews",
      label: "Reviews written",
      value: { kind: "count", value: m.reviews.count },
      hint: `Average ${formatRatingAverage(m.reviews.average).toLowerCase()} (hidden left out); ${formatCount(m.reviews.hidden)} hidden.`,
    },
  ];
}

/**
 * Every analytics section for one admin_metrics answer: headline tiles, sign-ups and
 * bookings per day, the application funnel, completion and cancellation rates, top cities
 * and support resolution time. Each chart has its data table; empty sections say so.
 */
export function AnalyticsReport({ metrics }: { metrics: PlatformMetrics }) {
  const m = metrics;
  const days = `${formatCount(m.range.days)} ${m.range.days === 1 ? "day" : "days"}`;
  const funnel = applicationFunnel(m);
  const rates = rateBars(m);
  const cities = cityBars(m);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {formatLongDay(m.range.from)} to {formatLongDay(m.range.to)}, {days}, India time.
      </p>
      {isEmptyRange(m) ? (
        <p role="status" className="rounded-lg border border-dashed border-input p-4 text-sm text-muted-foreground">
          Nothing was recorded in this range: no sign-ups, bookings, applications, reviews or
          support cases. Pick a longer range to see trends.
        </p>
      ) : null}

      <MetricTiles tiles={tilesFor(m)} />

      <ChartCard
        title="Sign-ups per day, by role"
        description="New accounts by the day they were created. A role is set when the person picks client or trainer in the app."
        empty={m.signups.total === 0 ? "No sign-ups in this range." : null}
        chart={
          <StackedDayChart
            series={SIGNUP_SERIES.map(({ key, label, slot }) => ({ key, label, slot }))}
            days={m.signups.by_day.map((row) => ({ day: row.day, values: SIGNUP_SERIES.map((s) => s.value(row)) }))}
            summary={`Sign-ups per day: ${formatCount(m.signups.total)} in ${days}.`}
          />
        }
        table={
          <MetricTable
            caption="Sign-ups per day by role"
            columns={["Day", ...SIGNUP_SERIES.map((s) => s.label), "Total"]}
            rows={m.signups.by_day.map((row) => ({
              key: row.day,
              cells: [formatDay(row.day), ...SIGNUP_SERIES.map((s) => formatCount(s.value(row))), formatCount(row.total)],
            }))}
          />
        }
      />

      <ChartCard
        title="Bookings per day, by status"
        description="Bookings by session day and the status they hold now. The chart groups statuses; the table has each one."
        empty={m.bookings.total === 0 ? "No bookings with a session in this range." : null}
        chart={
          <StackedDayChart
            series={BOOKING_SERIES.map(({ key, label, slot }) => ({ key, label, slot }))}
            days={m.bookings.per_day.map((row) => ({ day: row.day, values: BOOKING_SERIES.map((s) => s.value(row)) }))}
            summary={`Bookings per day: ${formatCount(m.bookings.total)} in ${days}.`}
          />
        }
        table={
          <MetricTable
            caption="Bookings per day by status"
            columns={["Day", ...BOOKING_STATUS_ORDER.map((status) => BOOKING_STATUS_LABELS[status]), "Total"]}
            rows={m.bookings.per_day.map((row) => ({
              key: row.day,
              cells: [
                formatDay(row.day),
                ...BOOKING_STATUS_ORDER.map((status) => formatCount(bookingStatusCount(row, status))),
                formatCount(row.total),
              ],
            }))}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Application funnel"
          description="Applications submitted in the range, and decisions made in it (a decision may be on an earlier submission)."
          empty={m.applications.submitted === 0 && m.applications.decided === 0 ? "No applications submitted or decided in this range." : null}
          chart={<BarListChart data={funnel} summary={funnel.map((item) => `${item.label} ${item.display}`).join(", ")} />}
          table={
            <MetricTable
              caption="Application funnel and the status of this range's submissions"
              columns={["Measure", "Count"]}
              rows={[
                ...funnel.map((item) => ({ key: item.key, cells: [item.label, item.display] })),
                ...applicationStatusRows(m).map((row) => ({
                  key: `now-${row.label}`,
                  cells: [`Submitted, now ${row.label.toLowerCase()}`, formatCount(row.count)],
                })),
                { key: "approval", cells: ["Approval rate of decisions", formatPercent(m.applications.approval_rate)] },
                { key: "median", cells: ["Median time to decide", formatDays(m.applications.median_days_to_decision)] },
              ]}
            />
          }
        />

        <ChartCard
          title="Completion and cancellation rates"
          description={`Shares of the ${formatCount(m.bookings.settled)} settled bookings (completed, no-show, cancelled, disputed).`}
          empty={rates.length === 0 ? "No settled bookings in this range, so there are no rates yet." : null}
          chart={
            <BarListChart
              data={rates}
              max={100}
              summary={rates.map((item) => `${item.label} ${item.display}`).join(", ")}
            />
          }
          table={
            <MetricTable
              caption="Completion and cancellation rates"
              columns={["Measure", "Rate"]}
              rows={rates.map((item) => ({ key: item.key, cells: [item.label, item.display] }))}
            />
          }
        />

        <ChartCard
          title="Top cities"
          description="Bookings with a session in the range by the trainer's city, the ten busiest."
          empty={cities.length === 0 ? "No bookings in this range, so no cities to rank." : null}
          chart={<BarListChart data={cities} summary={cities.map((item) => `${item.label} ${item.display}`).join(", ")} />}
          table={
            <MetricTable
              caption="Bookings by city"
              columns={["City", "Bookings"]}
              rows={cities.map((item) => ({ key: item.key, cells: [item.label, item.display] }))}
            />
          }
        />

        <section
          aria-labelledby="analytics-support"
          className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-tile"
        >
          <div className="flex flex-col gap-0.5">
            <h2 id="analytics-support" className="text-base font-semibold">
              Support resolution time
            </h2>
            <p className="text-xs text-muted-foreground">
              Cases opened in the range, and cases resolved or closed in it with the median time from
              report to resolution.
            </p>
          </div>
          {m.support.opened === 0 && m.support.resolved === 0 ? (
            <p className="rounded-lg border border-dashed border-input p-4 text-sm text-muted-foreground">
              No support cases opened or resolved in this range.
            </p>
          ) : (
            <dl className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Opened</dt>
                <dd className="text-2xl font-bold tabular-nums">{formatCount(m.support.opened)}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Resolved</dt>
                <dd className="text-2xl font-bold tabular-nums">{formatCount(m.support.resolved)}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Median to resolve</dt>
                <dd className="text-2xl font-bold tabular-nums">{formatHours(m.support.median_hours_to_resolve)}</dd>
              </div>
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}

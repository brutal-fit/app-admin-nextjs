/*
 * Pure helpers for the analytics page: how numbers read, which series a chart draws, and
 * which colour slot each series holds. Colours are CSS variables from globals.css
 * (--chart-1 to --chart-4, validated together against the card surface); a series keeps
 * its slot whatever else is on screen.
 */
import { APPLICATION_STATUS_LABELS } from "@/features/applications/schemas";
import type { BookingDay, PlatformMetrics, SignupDay } from "@/lib/db/metrics";
import type { ApplicationStatus, BookingStatus } from "@/types/database";

export type ChartSlot = 1 | 2 | 3 | 4;

export type Series<Row> = {
  key: string;
  label: string;
  slot: ChartSlot;
  value: (row: Row) => number;
};

/** The fill for a slot, as an SVG paint or CSS colour. */
export function slotColor(slot: ChartSlot): string {
  return `var(--chart-${slot})`;
}

/** "83%" from 0.8333; "No data" when the server had nothing to divide. */
export function formatPercent(value: number | null): string {
  return value === null ? "No data" : `${Math.round(value * 100)}%`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

/** "12 Oct" for an India date "YYYY-MM-DD" (the date is already India's). */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

/** "12 Oct 2026" for the range line. */
export function formatLongDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const SIGNUP_SERIES: readonly Series<SignupDay>[] = [
  { key: "client", label: "Clients", slot: 1, value: (row) => row.client },
  { key: "trainer", label: "Trainers", slot: 2, value: (row) => row.trainer },
  { key: "none", label: "No role yet", slot: 3, value: (row) => row.none },
];

/**
 * Eight booking statuses would need eight hues; the chart folds them into four groups and
 * the data table under it keeps every status.
 */
export const BOOKING_STATUS_GROUPS: readonly { key: string; label: string; slot: ChartSlot; statuses: readonly BookingStatus[] }[] = [
  {
    key: "open",
    label: "Requested or upcoming",
    slot: 1,
    statuses: ["requested", "pending_confirmation", "confirmed", "reschedule_requested"],
  },
  { key: "completed", label: "Completed", slot: 2, statuses: ["completed"] },
  { key: "cancelled", label: "Cancelled", slot: 3, statuses: ["cancelled"] },
  { key: "problem", label: "No-show or disputed", slot: 4, statuses: ["no_show", "disputed"] },
];

function statusCount(row: BookingDay, status: BookingStatus): number {
  return row.by_status[status] ?? 0;
}

export const BOOKING_SERIES: readonly Series<BookingDay>[] = BOOKING_STATUS_GROUPS.map((group) => ({
  key: group.key,
  label: group.label,
  slot: group.slot,
  value: (row: BookingDay) => group.statuses.reduce((sum, status) => sum + statusCount(row, status), 0),
}));

export function bookingStatusCount(row: BookingDay, status: BookingStatus): number {
  return statusCount(row, status);
}

export type BarDatum = { key: string; label: string; value: number; display: string };

/** Submitted, decided, approved, rejected: decisions in the range, not only of its submissions. */
export function applicationFunnel(metrics: PlatformMetrics): BarDatum[] {
  const a = metrics.applications;
  return [
    { key: "submitted", label: "Submitted", value: a.submitted, display: formatCount(a.submitted) },
    { key: "decided", label: "Decided", value: a.decided, display: formatCount(a.decided) },
    { key: "approved", label: "Approved", value: a.approved, display: formatCount(a.approved) },
    { key: "rejected", label: "Rejected", value: a.rejected, display: formatCount(a.rejected) },
  ];
}

const APPLICATION_TABLE_ORDER: readonly ApplicationStatus[] = [
  "submitted",
  "under_review",
  "needs_information",
  "approved",
  "rejected",
  "suspended",
];

/** Applications submitted in the range by the status they hold now. */
export function applicationStatusRows(metrics: PlatformMetrics): { label: string; count: number }[] {
  return APPLICATION_TABLE_ORDER.map((status) => ({
    label: APPLICATION_STATUS_LABELS[status],
    count: metrics.applications.by_status[status] ?? 0,
  }));
}

const CANCELLED_BY_LABELS = {
  client: "Cancelled by the client",
  trainer: "Cancelled or declined by the trainer",
  admin: "Cancelled by BRUTAL",
  unknown: "Cancelled, party not recorded",
} as const;

/** Rates of settled bookings, as percentages 0 to 100; rows without data are left out. */
export function rateBars(metrics: PlatformMetrics): BarDatum[] {
  const b = metrics.bookings;
  const rows: { key: string; label: string; rate: number | null }[] = [
    { key: "completion", label: "Completed", rate: b.completion_rate },
    { key: "no_show", label: "No-show", rate: b.no_show_rate },
    { key: "cancellation", label: "Cancelled", rate: b.cancellation_rate },
    ...(Object.keys(CANCELLED_BY_LABELS) as (keyof typeof CANCELLED_BY_LABELS)[]).map((who) => ({
      key: `cancelled_${who}`,
      label: CANCELLED_BY_LABELS[who],
      rate: b.cancellations_by[who].rate,
    })),
  ];
  return rows
    .filter((row): row is { key: string; label: string; rate: number } => row.rate !== null)
    .map((row) => ({ key: row.key, label: row.label, value: row.rate * 100, display: formatPercent(row.rate) }));
}

export function cityBars(metrics: PlatformMetrics): BarDatum[] {
  return metrics.top_cities.map((row) => ({
    key: row.city,
    label: row.city,
    value: row.bookings,
    display: formatCount(row.bookings),
  }));
}

/** True when nothing at all happened in the range (every section would be empty). */
export function isEmptyRange(metrics: PlatformMetrics): boolean {
  return (
    metrics.signups.total === 0 &&
    metrics.bookings.total === 0 &&
    metrics.applications.submitted === 0 &&
    metrics.applications.decided === 0 &&
    metrics.reviews.count === 0 &&
    metrics.support.opened === 0 &&
    metrics.support.resolved === 0
  );
}

/** "1.5 h", "2.3 days" for a median wait; "No data" without one. */
export function formatHours(hours: number | null): string {
  if (hours === null) return "No data";
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function formatDays(days: number | null): string {
  return days === null ? "No data" : `${days.toFixed(1)} ${days === 1 ? "day" : "days"}`;
}

export function formatRatingAverage(average: number | null): string {
  return average === null ? "No data" : `${average.toFixed(2)} of 5`;
}

/**
 * The top of a count axis: the value rounded up to 1, 2 or 5 times a power of ten, and the
 * ticks from zero to it (three when the half is a whole number). Zero still gets an axis of 1.
 */
export function countAxis(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const power = 10 ** Math.floor(Math.log10(max));
  const top = [1, 2, 5, 10].map((step) => step * power).find((candidate) => candidate >= max) ?? 10 * power;
  const ticks = top >= 2 && Number.isInteger(top / 2) ? [0, top / 2, top] : [0, top];
  return { top, ticks };
}

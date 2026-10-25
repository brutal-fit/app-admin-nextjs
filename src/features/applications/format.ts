import type { ApplicationStatus, AvailabilityWindowRow, DocumentStatus } from "@/types/database";

const NO_VALUE = "Not given";

/** INR as plain ASCII ("INR 1,200"); the rupee sign is outside the house character set. */
export function formatInr(value: number | null): string {
  return value === null ? NO_VALUE : `INR ${value.toLocaleString("en-IN")}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return NO_VALUE;
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinute(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// ISO weekdays, as availability_windows stores them (1 Monday .. 7 Sunday).
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** One line per weekday that has hours, e.g. { day: "Mon", ranges: "06:00-09:00, 18:00-20:00" }. */
export function summariseAvailability(
  windows: readonly AvailabilityWindowRow[],
): { day: string; ranges: string }[] {
  const byDay = new Map<number, string[]>();
  for (const window of windows) {
    const ranges = byDay.get(window.weekday) ?? [];
    ranges.push(`${formatMinute(window.start_minute)}-${formatMinute(window.end_minute)}`);
    byDay.set(window.weekday, ranges);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekday, ranges]) => ({
      day: WEEKDAYS[weekday - 1] ?? `Day ${weekday}`,
      ranges: ranges.join(", "),
    }));
}

/** Badge classes for an application status (outline badges, see docs/architecture.md). */
export function applicationStatusTone(status: ApplicationStatus): string {
  switch (status) {
    case "approved":
      return "border-success text-success";
    case "submitted":
    case "under_review":
    case "needs_information":
      return "border-warning text-warning";
    case "rejected":
    case "suspended":
      return "border-destructive text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export function documentStatusTone(status: DocumentStatus): string {
  if (status === "accepted") return "border-success text-success";
  if (status === "rejected") return "border-destructive text-destructive";
  return "border-warning text-warning";
}

/** Chip classes for a required document row in the review panel. */
export function requiredDocumentTone(
  state: "missing" | "waiting" | "resubmitted" | "accepted" | "rejected",
): string {
  if (state === "accepted") return "border-success text-success";
  if (state === "rejected") return "border-destructive text-destructive";
  if (state === "missing") return "text-muted-foreground";
  return "border-warning text-warning";
}

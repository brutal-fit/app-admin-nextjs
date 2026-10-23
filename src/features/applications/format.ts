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

export type TimelineStep = {
  key: "draft" | "submitted" | "under_review" | "needs_information" | "decision";
  label: string;
  /** The timestamp the data has for this step, if any. */
  at: string | null;
  note?: string;
};

const TIMELINE_RANK: Record<Exclude<ApplicationStatus, "approved" | "rejected" | "suspended">, number> = {
  draft: 0,
  submitted: 1,
  under_review: 2,
  needs_information: 3,
};

const DECISION_LABELS: Partial<Record<ApplicationStatus, string>> = {
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

/** The timeline step an application is on: 0 draft .. 3 needs information, 4 decided. */
export function timelineIndex(status: ApplicationStatus): number {
  return status in TIMELINE_RANK ? TIMELINE_RANK[status as keyof typeof TIMELINE_RANK] : 4;
}

/**
 * The application's steps in rank order (draft, submitted, under review, needs information,
 * decision), each with the timestamp the table has for it. Steps keep their rank order even
 * when the data disagrees: a step dated after a later step (a draft created after its own
 * submission, as one seed row is) shows the later step's time, the latest it can have
 * happened, so the timeline never reads backwards.
 */
export function applicationTimelineSteps(input: {
  status: ApplicationStatus;
  createdAt: string;
  submittedAt: string | null;
  updatedAt: string;
}): TimelineStep[] {
  const { status, createdAt, submittedAt, updatedAt } = input;
  const current = timelineIndex(status);
  const decided = current === 4;
  const steps: TimelineStep[] = [
    { key: "draft", label: "Draft", at: createdAt, note: "Started" },
    { key: "submitted", label: "Submitted", at: submittedAt },
    { key: "under_review", label: "Under review", at: status === "under_review" ? updatedAt : null },
    {
      key: "needs_information",
      label: "Needs information",
      at: status === "needs_information" ? updatedAt : null,
      note: current > 3 ? "Only if ops asked; may have been skipped" : "Only if ops ask",
    },
    {
      key: "decision",
      label: decided ? (DECISION_LABELS[status] ?? "Decision") : "Approved or rejected",
      at: decided ? updatedAt : null,
    },
  ];

  let later: { at: string; time: number } | null = null;
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (!step?.at) continue;
    const time = Date.parse(step.at);
    if (Number.isNaN(time)) continue;
    if (later && time > later.time) {
      step.at = later.at;
    } else {
      later = { at: step.at, time };
    }
  }
  return steps;
}

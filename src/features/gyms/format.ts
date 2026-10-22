/*
 * Pure helpers shared by the BRUTAL gym pages and the gym manager area: status labels and
 * tones, opening hours, staff wording. No data access, so the wording is testable with plain
 * values.
 */
import type { GymStaffRole, GymStaffStatus, GymStatus } from "@/types/database";

export const GYM_STATUS_LABELS: Record<GymStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  verified: "Verified",
  listed: "Listed",
  suspended: "Suspended",
};

/** Badge classes for a gym status (outline badges, see docs/architecture.md). */
export function gymStatusTone(status: GymStatus): string {
  switch (status) {
    case "listed":
      return "border-success text-success";
    case "submitted":
    case "verified":
      return "border-warning text-warning";
    case "suspended":
      return "border-destructive text-destructive";
    default:
      return "text-muted-foreground";
  }
}

/** One line on what the status means for clients and what happens next. */
export function gymStatusHint(status: GymStatus): string {
  switch (status) {
    case "draft":
      return "Not visible to clients. The gym sends it for review when the profile, services and hours are ready.";
    case "submitted":
      return "Waiting for BRUTAL to verify it. Not visible to clients yet.";
    case "verified":
      return "Verified by BRUTAL. Clients see it once BRUTAL lists it.";
    case "listed":
      return "Live: clients can find the gym and book its priced services.";
    case "suspended":
      return "Taken off the listing by BRUTAL. Clients cannot find or book it.";
  }
}

export const STAFF_ROLE_LABELS: Record<GymStaffRole, string> = {
  manager: "Manager",
  trainer: "Trainer",
};

export const STAFF_STATUS_LABELS: Record<GymStaffStatus, string> = {
  invited: "Invited",
  active: "Active",
  removed: "Removed",
};

export function staffStatusTone(status: GymStaffStatus): string {
  switch (status) {
    case "active":
      return "border-success text-success";
    case "invited":
      return "border-warning text-warning";
    default:
      return "text-muted-foreground";
  }
}

/** ISO weekdays as gym_hours stores them (1 Monday .. 7 Sunday). */
export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

/** Minutes since midnight as "HH:MM"; 1440 reads "24:00". */
export function formatMinute(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "HH:MM" (or "24:00") to minutes since midnight, or null when it is not a time. */
export function parseMinute(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > 24 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
}

/** One line per weekday that has hours, in week order, e.g. "06:00-10:00, 17:00-21:00". */
export function summariseHours(
  windows: readonly { weekday: number; start_minute: number; end_minute: number }[],
): { day: string; ranges: string }[] {
  const days = new Map<number, string[]>();
  const sorted = [...windows].sort((a, b) => a.weekday - b.weekday || a.start_minute - b.start_minute);
  for (const w of sorted) {
    const ranges = days.get(w.weekday) ?? [];
    ranges.push(`${formatMinute(w.start_minute)}-${formatMinute(w.end_minute)}`);
    days.set(w.weekday, ranges);
  }
  return [...days.entries()].map(([weekday, ranges]) => ({
    day: WEEKDAY_LABELS[weekday] ?? `Day ${weekday}`,
    ranges: ranges.join(", "),
  }));
}

/** The first word of a name: gyms see clients by first name only. */
export function firstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? first : "BRUTAL member";
}

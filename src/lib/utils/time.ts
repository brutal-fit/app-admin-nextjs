/*
 * Time helpers for server loaders. They read the clock here, outside components, so renders
 * stay pure; pass `now` to make them deterministic in tests. BRUTAL runs on India time.
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function currentTime(): number {
  return Date.now();
}

export function daysAgoIso(days: number, now: number = currentTime()): string {
  return new Date(now - days * DAY_MS).toISOString();
}

/** Today in India as a UTC range [from, to) for timestamptz filters. */
export function istDayRange(now: number = currentTime()): { from: string; to: string } {
  const istMidnight = Math.floor((now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
  return {
    from: new Date(istMidnight).toISOString(),
    to: new Date(istMidnight + DAY_MS).toISOString(),
  };
}

/** The hour of day in India, 0 to 23. */
export function istHour(now: number = currentTime()): number {
  return new Date(now + IST_OFFSET_MS).getUTCHours();
}

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then a date. */
export function formatRelativeTime(iso: string, now: number): string {
  const elapsed = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "3 days" for how long something has waited; "less than an hour" under one hour. */
export function formatWaiting(iso: string, now: number): string {
  const hours = Math.floor(Math.max(0, now - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return "less than an hour";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

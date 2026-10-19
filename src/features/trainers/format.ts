/*
 * Pure helpers for the trainer pages: labels and tones. No data access, so the wording is
 * testable with plain values.
 */

/** Badge classes for the listing state (outline badges, see docs/architecture.md). */
export function listedTone(listed: boolean): string {
  return listed ? "border-success text-success" : "text-muted-foreground";
}

export function listedLabel(listed: boolean): string {
  return listed ? "Listed" : "Not listed";
}

/** "4.6 (12 reviews)", or "No reviews yet"; hidden reviews are already left out. */
export function formatRating(average: number | null, count: number): string {
  if (count === 0 || average === null) return "No reviews yet";
  return `${average.toFixed(1)} (${count} ${count === 1 ? "review" : "reviews"})`;
}

/** A text list for display and for the comma-separated form inputs. */
export function joinList(items: readonly string[]): string {
  return items.join(", ");
}

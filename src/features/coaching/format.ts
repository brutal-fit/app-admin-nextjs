/* Pure helpers for custom plans: badge tones and an exercise's prescription in words. */
import type { CustomPlanItemRow, CustomPlanStatus } from "@/types/database";

export function customPlanStatusTone(status: CustomPlanStatus): string {
  if (status === "active") return "border-success text-success";
  if (status === "draft") return "border-warning text-warning";
  return "text-muted-foreground";
}

/** "3 x 12, rest 60 s" for reps or "3 x 45 s, rest 30 s" for a timed exercise. */
export function formatPrescription(
  item: Pick<CustomPlanItemRow, "sets" | "reps" | "duration_seconds" | "rest_seconds">,
): string {
  const measure = item.reps !== null ? `${item.reps}` : `${item.duration_seconds ?? 0} s`;
  return `${item.sets} x ${measure}${item.rest_seconds > 0 ? `, rest ${item.rest_seconds} s` : ""}`;
}

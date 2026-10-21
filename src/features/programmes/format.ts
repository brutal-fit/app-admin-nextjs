import { formatInr } from "@/features/applications/format";
import type { ProgrammeStage } from "@/types/database";

export const PROGRAMME_STAGE_LABELS: Record<ProgrammeStage, string> = {
  enrolled: "Enrolled",
  trainer_assigned: "Trainer assigned",
  assessment_booked: "Assessment booked",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Outline badge classes: waiting stages in warning, running in success, closed muted. */
export function programmeStageTone(stage: ProgrammeStage): string {
  switch (stage) {
    case "active":
      return "border-success text-success";
    case "enrolled":
    case "trainer_assigned":
    case "assessment_booked":
      return "border-warning text-warning";
    case "completed":
    case "cancelled":
      return "text-muted-foreground";
  }
}

const PAYMENT_LABELS: Readonly<Record<string, string>> = {
  pilot_free: "Free during the pilot",
  pending: "Payment pending",
  paid: "Paid",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

export function paymentStatusLabel(status: string): string {
  return PAYMENT_LABELS[status] ?? status;
}

export function formatWeeklyPrice(value: number): string {
  return `${formatInr(value)} / week`;
}

export function formatWeeks(weeks: number): string {
  return weeks === 1 ? "1 week" : `${weeks} weeks`;
}

/** A date column (YYYY-MM-DD) as an India date, without a time zone shift. */
export function formatIsoDate(value: string | null): string {
  if (!value) return "Not started";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

export function formatEquipment(equipment: readonly string[]): string {
  return equipment.length === 0 ? "No equipment" : equipment.join(", ");
}

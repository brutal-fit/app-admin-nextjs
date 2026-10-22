/*
 * Pure helpers for the gym manager area: who can be allotted, how hours are checked before
 * saving, how a request reads. No data access, so the rules are testable with plain values.
 */
import { describePhone } from "@/features/users/format";
import type { GymStaffRow } from "@/types/database";

export type TrainerOption = { userId: string; label: string };

/**
 * The people a request can be allotted to: the gym's own trainers whose invite has bound to an
 * account and who are still active. Managers, pending invites and removed staff are left out;
 * gym_allot_trainer refuses anyone else with BRVAL. Labelled by phone, since gym staff rows
 * carry no name.
 */
export function allotCandidates(
  staff: readonly Pick<GymStaffRow, "user_id" | "phone" | "role" | "status">[],
  exclude: string | null = null,
): TrainerOption[] {
  const options: TrainerOption[] = [];
  for (const member of staff) {
    if (member.role !== "trainer" || member.status !== "active" || !member.user_id) continue;
    if (member.user_id === exclude) continue;
    if (options.some((option) => option.userId === member.user_id)) continue;
    options.push({ userId: member.user_id, label: describePhone(member.phone).text });
  }
  return options;
}

export type HoursWindowInput = { weekday: number; startMinute: number; endMinute: number };

/**
 * The first problem with a week of opening windows, worded as gym_set_hours words it, or null.
 * Windows on one day may not overlap and each must end after it starts.
 */
export function hoursProblem(windows: readonly HoursWindowInput[]): string | null {
  for (const w of windows) {
    if (w.endMinute <= w.startMinute) return "Fix the time ranges that end before they start.";
  }
  const sorted = [...windows].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (previous && current && previous.weekday === current.weekday && current.startMinute < previous.endMinute) {
      return "Some time ranges overlap. Merge them before saving.";
    }
  }
  return null;
}

/** What the platform price line says for a service. */
export function platformPriceText(priceInr: number | null): string {
  return priceInr === null ? "Awaiting BRUTAL approval" : `INR ${priceInr.toLocaleString("en-IN")}`;
}

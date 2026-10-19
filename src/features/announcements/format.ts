import { segmentSchema } from "@/features/announcements/schemas";
import type { Json } from "@/types/database";

export type SegmentSummary = { label: string; userId: string | null };

/** A stored segment in words; the user's name when the session could read it. */
export function describeSegment(segment: Json, names: Readonly<Record<string, string>>): SegmentSummary {
  const parsed = segmentSchema.safeParse(segment);
  if (!parsed.success) return { label: "Unknown audience", userId: null };
  const value = parsed.data;
  switch (value.audience) {
    case "all":
      return { label: "Everyone", userId: null };
    case "clients":
      return { label: "All clients", userId: null };
    case "trainers":
      return { label: value.city ? `Trainers in ${value.city}` : "All trainers", userId: null };
    case "user":
      return { label: names[value.user_id] ?? "One person", userId: value.user_id };
  }
}

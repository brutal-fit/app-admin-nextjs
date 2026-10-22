import { summariseHours } from "@/features/gyms/format";
import type { GymHoursWindow } from "@/lib/db/gyms-manager";

/** Opening hours by weekday in India time; days without a window are closed. */
export function GymHoursList({ hours }: { hours: readonly GymHoursWindow[] }) {
  const days = summariseHours(hours);
  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground">No opening hours yet. Clients cannot book a slot without them.</p>;
  }
  return (
    <dl className="flex max-w-xl flex-col divide-y rounded-lg border bg-card text-sm shadow-tile">
      {days.map((day) => (
        <div key={day.day} className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="font-medium">{day.day}</dt>
          <dd className="text-muted-foreground tabular-nums">{day.ranges}</dd>
        </div>
      ))}
    </dl>
  );
}

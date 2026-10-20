"use client";

import { useId, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StackedDayChart } from "@/features/analytics/components/stacked-day-chart";
import { formatCount } from "@/features/analytics/format";
import { ALL_EVENTS, eventDays, eventLabel } from "@/features/analytics/usage/format";
import type { UsageEvents } from "@/lib/db/usage";

/**
 * Events per day for one chosen event (or all of them). The choice is local view state; the
 * data is the one admin_usage_events answer the page already loaded.
 */
export function EventDayChart({ events, names }: { events: UsageEvents; names: readonly string[] }) {
  const [name, setName] = useState<string>(ALL_EVENTS);
  const selectId = useId();
  const label = name === ALL_EVENTS ? "All events" : eventLabel(name);
  const days = eventDays(events, name);
  const total = days.reduce((sum, day) => sum + (day.values[0] ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={selectId}>Event</Label>
        <Select value={name} onValueChange={setName}>
          <SelectTrigger id={selectId} className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_EVENTS}>All events</SelectItem>
            {names.map((option) => (
              <SelectItem key={option} value={option}>
                {eventLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <StackedDayChart
        series={[{ key: name, label, slot: 1 }]}
        days={days}
        summary={`${label} per day: ${formatCount(total)} in ${formatCount(days.length)} days.`}
      />
    </div>
  );
}

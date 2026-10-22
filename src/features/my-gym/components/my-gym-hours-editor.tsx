"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WEEKDAY_LABELS, formatMinute, parseMinute } from "@/features/gyms/format";
import { setGymHoursAction } from "@/features/my-gym/actions";
import { HOURS_WINDOWS_MAX, setGymHoursSchema } from "@/features/my-gym/schemas";
import type { GymHoursWindow } from "@/lib/db/gyms-manager";
import { showToast } from "@/stores/toast-store";

type Draft = { key: number; weekday: number; start: string; end: string };

function toDrafts(hours: readonly GymHoursWindow[]): Draft[] {
  return hours.map((w, index) => ({
    key: index,
    weekday: w.weekday,
    start: formatMinute(w.start_minute),
    end: formatMinute(w.end_minute),
  }));
}

/**
 * The gym's week of opening windows (India time), saved whole through gym_set_hours. Slots
 * for clients come from these hours. Windows on one day may not overlap. Gated by gym.self
 * and the gym's manager row.
 */
export function MyGymHoursEditor({ gymId, hours }: { gymId: string; hours: readonly GymHoursWindow[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(() => toDrafts(hours));
  const [nextKey, setNextKey] = useState(hours.length);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(key: number, change: Partial<Draft>) {
    setDrafts((current) => current.map((d) => (d.key === key ? { ...d, ...change } : d)));
  }

  function add() {
    setDrafts((current) => [...current, { key: nextKey, weekday: 1, start: "06:00", end: "10:00" }]);
    setNextKey((key) => key + 1);
  }

  function save() {
    const windows = drafts.map((d) => ({
      weekday: d.weekday,
      startMinute: parseMinute(d.start) ?? Number.NaN,
      endMinute: parseMinute(d.end) ?? Number.NaN,
    }));
    if (windows.some((w) => Number.isNaN(w.startMinute) || Number.isNaN(w.endMinute))) {
      setError("Enter every time as HH:MM.");
      return;
    }
    const input = { gymId, windows };
    const parsed = setGymHoursSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the hours.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setGymHoursAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", "Opening hours saved.");
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-3">
      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No opening hours yet. Clients cannot book a slot without them.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {drafts.map((draft, index) => (
            <li key={draft.key} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card px-3 py-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`hours-day-${draft.key}`}>Day</Label>
                <Select
                  value={String(draft.weekday)}
                  onValueChange={(value) => update(draft.key, { weekday: Number(value) })}
                  disabled={pending}
                >
                  <SelectTrigger id={`hours-day-${draft.key}`} className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`hours-start-${draft.key}`}>Opens</Label>
                <Input
                  id={`hours-start-${draft.key}`}
                  type="time"
                  value={draft.start}
                  onChange={(event) => update(draft.key, { start: event.target.value })}
                  disabled={pending}
                  className="w-32"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`hours-end-${draft.key}`}>Closes</Label>
                <Input
                  id={`hours-end-${draft.key}`}
                  type="time"
                  value={draft.end === "24:00" ? "23:59" : draft.end}
                  onChange={(event) => update(draft.key, { end: event.target.value })}
                  disabled={pending}
                  className="w-32"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrafts((current) => current.filter((d) => d.key !== draft.key))}
                disabled={pending}
                aria-label={`Remove window ${index + 1}`}
              >
                <Trash2 size={16} aria-hidden="true" />
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={add} disabled={pending || drafts.length >= HOURS_WINDOWS_MAX}>
          <Plus size={16} aria-hidden="true" />
          Add window
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save hours"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

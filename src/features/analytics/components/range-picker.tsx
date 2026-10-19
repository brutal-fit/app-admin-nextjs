"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Calendar } from "@/components/icons";
import { FilterChips } from "@/components/data-table/filter-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RANGE_PRESETS,
  analyticsHref,
  type AnalyticsRange,
} from "@/features/analytics/schemas";
import { isIsoDate } from "@/lib/utils/time";

/**
 * The analytics range: presets for the last 7, 30 and 90 days as links, and a custom range
 * form. The range lives in the URL, so a view can be shared. Gated by metrics.read.
 */
export function RangePicker({ range, today }: { range: AnalyticsRange; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  function onApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isIsoDate(from) || !isIsoDate(to)) return;
    startTransition(() => router.push(analyticsHref({ from, to })));
  }

  return (
    <div className="flex flex-wrap items-end gap-4" aria-busy={pending}>
      <FilterChips
        label="Date range"
        chips={RANGE_PRESETS.map((preset) => ({
          id: String(preset),
          label: `Last ${preset} days`,
          active: range.preset === preset,
          href: analyticsHref({ preset }),
        }))}
      />
      <form onSubmit={onApply} aria-label="Custom range" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="analytics-from">From</Label>
          <Input
            id="analytics-from"
            type="date"
            value={from}
            max={today}
            required
            onChange={(event) => setFrom(event.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="analytics-to">To</Label>
          <Input
            id="analytics-to"
            type="date"
            value={to}
            max={today}
            required
            onChange={(event) => setTo(event.target.value)}
            className="w-44"
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          <Calendar size={16} aria-hidden="true" />
          Apply range
        </Button>
      </form>
    </div>
  );
}

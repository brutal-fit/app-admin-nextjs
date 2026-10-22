import Link from "next/link";
import { Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { programmesHref } from "@/features/programmes/schemas";
import { cn } from "@/lib/utils";
import type { ProgrammeDayRow } from "@/types/database";

/**
 * The authored days of one plan with their target minutes ("Rest" at 0), each linking to
 * its workout editor, plus "Add day" for the next day number while the plan has room.
 * Gated by catalogue.manage.
 */
export function ProgrammeDayList({
  planId,
  planTitle,
  totalDays,
  days,
  selectedDay,
}: {
  planId: string;
  planTitle: string;
  /** The plan's length in days (weeks times 7). */
  totalDays: number;
  days: readonly ProgrammeDayRow[];
  selectedDay: number | null;
}) {
  const lastDay = days.reduce((highest, day) => Math.max(highest, day.day_number), 0);
  const nextDay = lastDay + 1;

  return (
    <nav aria-label={`Days of ${planTitle}`} className="flex flex-col gap-3">
      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">No days written yet. Start with day 1.</p>
      ) : (
        <ol className="flex flex-col divide-y rounded-lg border bg-card shadow-tile">
          {days.map((day) => {
            const current = day.day_number === selectedDay;
            return (
              <li key={day.id}>
                <Link
                  href={programmesHref({ planId, dayNumber: day.day_number })}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "focus-ring flex items-baseline gap-3 px-3 py-2 text-sm hover:bg-surface-raised",
                    current && "bg-surface-raised",
                  )}
                >
                  <span className="w-14 shrink-0 text-muted-foreground">Day {day.day_number}</span>
                  <span className={cn("min-w-0 flex-1 truncate", current && "font-medium")}>{day.title}</span>
                  {day.target_minutes === null ? null : (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {day.target_minutes === 0 ? "Rest" : `${day.target_minutes} min`}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      {nextDay <= totalDays ? (
        <Button asChild size="sm" variant="outline" className="w-fit">
          <Link href={programmesHref({ planId, dayNumber: nextDay })}>
            <Plus size={16} aria-hidden="true" />
            Add day {nextDay}
          </Link>
        </Button>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {`The plan runs ${totalDays} days. Days past the last written one repeat the written days in order.`}
      </p>
    </nav>
  );
}

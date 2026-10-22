import Link from "next/link";
import { X } from "@/components/icons";
import type { ProgrammesResult } from "@/features/programmes/api";
import { ProgrammeDayEditor } from "@/features/programmes/components/programme-day-editor";
import { ProgrammeDayList } from "@/features/programmes/components/programme-day-list";
import { ProgrammePlanList } from "@/features/programmes/components/programme-plan-list";
import { ProgrammePlanSheet } from "@/features/programmes/components/programme-plan-sheet";
import { formatEquipment, formatWeeks } from "@/features/programmes/format";
import { PLAN_SORT_MAX, programmesHref, type ProgrammeSelection } from "@/features/programmes/schemas";

const SORT_STEP = 10;

/**
 * The Programmes tab of /catalogue: the plan list with "New plan", and below it the days of
 * the plan chosen in the URL with the workout editor for the chosen day. Gated by
 * catalogue.manage.
 */
export function ProgrammesSection({
  result,
  selection,
}: {
  result: ProgrammesResult;
  selection: ProgrammeSelection;
}) {
  if (!result.ok) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {result.error}
      </p>
    );
  }

  const { plans, trainers, selection: chosen } = result;
  const trainerOptions = trainers.ok ? trainers.options : [];
  const trainersError = trainers.ok ? null : trainers.error;
  const highestSort = plans.reduce((highest, plan) => Math.max(highest, plan.sort_order), 0);
  const nextSortOrder = Math.min(plans.length === 0 ? 0 : highestSort + SORT_STEP, PLAN_SORT_MAX);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="programme-plans" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="programme-plans" className="text-lg font-semibold">
              Programmes
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Self-guided workout plans clients start from the app and follow day by day. Clients
              see active plans only, in this order. Workouts are built from the Exercises tab.
            </p>
          </div>
          <ProgrammePlanSheet
            mode="create"
            trainers={trainerOptions}
            trainersError={trainersError}
            nextSortOrder={nextSortOrder}
          />
        </div>
        {trainersError ? (
          <p className="text-sm text-muted-foreground">{`The trainer list did not load: ${trainersError}`}</p>
        ) : null}
        <ProgrammePlanList
          plans={plans}
          trainers={trainerOptions}
          trainersError={trainersError}
          selectedPlanId={selection.planId}
          nextSortOrder={nextSortOrder}
        />
      </section>

      {chosen === null ? null : !chosen.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {chosen.error}
        </p>
      ) : (
        <section aria-labelledby="programme-days" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="programme-days" className="text-lg font-semibold">
                {`Days of ${chosen.plan.title}`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {`${formatWeeks(chosen.plan.weeks)}. ${formatEquipment(chosen.plan.equipment)}.`}
              </p>
            </div>
            <Link
              href={programmesHref()}
              className="focus-ring inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-foreground"
            >
              <X size={16} aria-hidden="true" />
              Close days
            </Link>
          </div>
          <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
            <ProgrammeDayList
              planId={chosen.plan.id}
              planTitle={chosen.plan.title}
              totalDays={chosen.plan.weeks * 7}
              days={chosen.days}
              selectedDay={chosen.selectedDay?.dayNumber ?? null}
            />
            {chosen.selectedDay ? (
              <ProgrammeDayEditor
                // Keyed on the stored day so the editor starts from what was saved.
                key={`${chosen.selectedDay.dayNumber}-${chosen.selectedDay.day?.updated_at ?? "new"}`}
                planId={chosen.plan.id}
                dayNumber={chosen.selectedDay.dayNumber}
                day={chosen.selectedDay.day}
                items={chosen.selectedDay.items}
                exercises={chosen.selectedDay.exercises}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Pick a day to edit its workout.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

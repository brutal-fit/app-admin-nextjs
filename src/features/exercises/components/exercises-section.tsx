import type { ExercisesState } from "@/features/exercises/api";
import { ExerciseList } from "@/features/exercises/components/exercise-list";
import { ExerciseSheet } from "@/features/exercises/components/exercise-sheet";
import { nextExerciseSortOrder } from "@/features/exercises/schemas";

/**
 * The Exercises tab of /catalogue: the library workouts are built from, with "New exercise".
 * Gated by catalogue.manage.
 */
export function ExercisesSection({ state }: { state: ExercisesState }) {
  if (!state.ok) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  }

  const nextSortOrder = nextExerciseSortOrder(state.rows.map((row) => row.sort_order));
  const withoutVideo = state.rows.filter((row) => row.video_url === null).length;

  return (
    <section aria-labelledby="exercise-library" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="exercise-library" className="text-lg font-semibold">
            Exercises
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            The moves programme workouts are built from. The app plays each exercise&apos;s demo
            video, or its figure with &quot;Demo video coming&quot; until a video link is set.
            {state.rows.length === 0
              ? ""
              : withoutVideo === 0
                ? " Every exercise has a video."
                : ` ${withoutVideo} of ${state.rows.length} ${state.rows.length === 1 ? "has" : "have"} no video yet.`}
          </p>
        </div>
        <ExerciseSheet mode="create" nextSortOrder={nextSortOrder} />
      </div>
      <ExerciseList exercises={state.rows} nextSortOrder={nextSortOrder} />
    </section>
  );
}

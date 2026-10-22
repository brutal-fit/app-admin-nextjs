"use client";

import { useTransition } from "react";
import { List } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setExerciseActiveAction } from "@/features/exercises/actions";
import { ExerciseSheet } from "@/features/exercises/components/exercise-sheet";
import { EXERCISE_KIND_LABELS } from "@/features/exercises/schemas";
import { formatEquipment } from "@/features/programmes/format";
import type { AdminExercise } from "@/lib/db/programmes";
import { showToast } from "@/stores/toast-store";

/**
 * The exercise library in the app's order, active or not: name and key, muscle group, kind,
 * equipment, whether the demo video is set, how many workout items use it, and status. Edit
 * opens the exercise sheet; activate or deactivate goes through admin_set_exercise_active.
 * Gated by catalogue.manage.
 */
export function ExerciseList({
  exercises,
  nextSortOrder,
}: {
  exercises: readonly AdminExercise[];
  nextSortOrder: number;
}) {
  const [pending, startTransition] = useTransition();

  function setActive(exercise: AdminExercise, active: boolean) {
    startTransition(async () => {
      const result = await setExerciseActiveAction({ id: exercise.id, active });
      if (!result.ok) {
        showToast("error", result.error.message);
        return;
      }
      showToast("success", active ? `${exercise.name} is active.` : `${exercise.name} is inactive.`);
    });
  }

  if (exercises.length === 0) {
    return (
      <EmptyState
        icon={List}
        title="No exercises yet"
        description="Add exercises here, then build workouts from them in Programmes."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-tile" aria-busy={pending}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Exercise</TableHead>
            <TableHead>Muscle group</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Equipment</TableHead>
            <TableHead>Video</TableHead>
            <TableHead>Used in</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.map((exercise) => (
            <TableRow key={exercise.id}>
              <TableCell className="min-w-48 whitespace-normal">
                <div className="flex flex-col">
                  <span className={exercise.active ? "font-medium" : "font-medium text-muted-foreground"}>
                    {exercise.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{exercise.key}</span>
                </div>
              </TableCell>
              <TableCell className="capitalize">{exercise.muscle_group}</TableCell>
              <TableCell>{EXERCISE_KIND_LABELS[exercise.kind]}</TableCell>
              <TableCell className="min-w-32 whitespace-normal text-muted-foreground">
                {formatEquipment(exercise.equipment)}
              </TableCell>
              <TableCell>
                {exercise.video_url ? (
                  <Badge variant="outline" className="border-success text-success">
                    Set
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Not set
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {exercise.item_count === 0
                  ? "No workouts"
                  : `${exercise.item_count} ${exercise.item_count === 1 ? "item" : "items"}`}
              </TableCell>
              <TableCell>
                {exercise.active ? (
                  <Badge variant="outline" className="border-success text-success">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <ExerciseSheet
                    // Keyed on the stored version so the sheet starts from the saved exercise.
                    key={exercise.updated_at}
                    mode="edit"
                    exercise={exercise}
                    nextSortOrder={nextSortOrder}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setActive(exercise, !exercise.active)}
                    aria-label={`${exercise.active ? "Deactivate" : "Activate"} ${exercise.name}`}
                  >
                    {exercise.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

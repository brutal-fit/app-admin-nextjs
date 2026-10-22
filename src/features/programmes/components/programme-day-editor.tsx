"use client";

import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { moveItem } from "@/features/catalogue/schemas";
import type { ExercisesState } from "@/features/exercises/api";
import { EXERCISE_KIND_LABELS } from "@/features/exercises/schemas";
import { saveDayAction } from "@/features/programmes/actions";
import {
  DAY_BUILT_BY_MAX,
  DAY_ITEMS_MAX,
  DAY_TARGET_MINUTES_MAX,
  DAY_TITLE_MAX,
  ITEM_DURATION_MAX,
  ITEM_DURATION_MIN,
  ITEM_REPS_MAX,
  ITEM_REPS_MIN,
  ITEM_REST_MAX,
  ITEM_SETS_MAX,
  ITEM_SETS_MIN,
  ITEM_TEMPO_MAX,
  estimateWorkoutMinutes,
  firstIssueMessage,
  saveDaySchema,
  type SaveDayInput,
} from "@/features/programmes/schemas";
import { parseIntegerText } from "@/features/settings/schemas";
import type { AdminExercise } from "@/lib/db/programmes";
import { showToast } from "@/stores/toast-store";
import type { ExerciseKind, ProgrammeDayRow, ProgrammeItemRow } from "@/types/database";

// Defaults a new item, or an item switched to the other kind, starts with.
const DEFAULT_SETS = "3";
const DEFAULT_REPS = "10";
const DEFAULT_DURATION = "30";
const DEFAULT_REST = "60";

type ItemDraft = {
  /** Stable React key; the server id for stored items. */
  localKey: string;
  id: string | null;
  /** Empty until an exercise is picked (items written before the library have none). */
  exerciseId: string;
  /** The stored item's title, for an item whose exercise is not in the loaded library. */
  storedTitle: string | null;
  /** The stored item's kind from its numbers, used only when the library did not load. */
  storedKind: ExerciseKind | null;
  /** Set on items written before the library: what they were. */
  legacyLabel: string | null;
  sets: string;
  reps: string;
  duration: string;
  rest: string;
  tempo: string;
};

function numberText(value: number | null): string {
  return value === null ? "" : String(value);
}

function toDraft(item: ProgrammeItemRow): ItemDraft {
  const legacy = item.exercise_id === null;
  return {
    localKey: item.id,
    id: item.id,
    exerciseId: item.exercise_id ?? "",
    storedTitle: item.title,
    storedKind: item.duration_s !== null ? "timed" : item.reps !== null ? "reps" : null,
    legacyLabel: legacy ? (item.kind === "workout" ? `"${item.title}"` : `a ${item.kind} item, "${item.title}"`) : null,
    sets: numberText(item.sets) || (legacy ? DEFAULT_SETS : ""),
    reps: numberText(item.reps),
    duration: numberText(item.duration_s),
    rest: numberText(item.rest_s) || (legacy ? DEFAULT_REST : ""),
    tempo: item.tempo ?? "",
  };
}

/** Blank reads as "not given"; anything else is the number typed (NaN when not a number). */
function optionalNumber(text: string): number | null {
  return text.trim() === "" ? null : Number(text.trim());
}

function exerciseLabel(exercise: AdminExercise): string {
  const details = `${exercise.muscle_group}, ${EXERCISE_KIND_LABELS[exercise.kind].toLowerCase()}`;
  return exercise.active ? `${exercise.name} (${details})` : `${exercise.name} (${details}, inactive)`;
}

/**
 * One workout day of a plan: title, "built by", target minutes and its exercises from the
 * library, each with sets, reps (a reps exercise) or seconds (a timed one), rest and an
 * optional tempo, in order. A day with no exercises is a rest day. Save writes the whole day
 * through admin_upsert_programme_day; exercises removed here are deleted with clients' ticks
 * on them. Gated by catalogue.manage.
 */
export function ProgrammeDayEditor({
  planId,
  dayNumber,
  day,
  items,
  exercises,
}: {
  planId: string;
  dayNumber: number;
  /** Null for a day not written yet. */
  day: ProgrammeDayRow | null;
  items: readonly ProgrammeItemRow[];
  exercises: ExercisesState;
}) {
  const base = `day-${planId}-${dayNumber}`;
  const library = useMemo(() => (exercises.ok ? exercises.rows : []), [exercises]);
  const byId = useMemo(() => new Map(library.map((exercise) => [exercise.id, exercise])), [library]);

  const [title, setTitle] = useState(day?.title ?? "");
  const [builtBy, setBuiltBy] = useState(day?.built_by ?? "");
  const [target, setTarget] = useState(numberText(day?.target_minutes ?? null));
  const [drafts, setDrafts] = useState<ItemDraft[]>(() => items.map(toDraft));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const newKey = useRef(0);

  function kindOf(draft: ItemDraft): ExerciseKind | null {
    return byId.get(draft.exerciseId)?.kind ?? (draft.exerciseId === "" ? null : draft.storedKind);
  }

  const estimate = estimateWorkoutMinutes(
    drafts.flatMap((draft) => {
      const kind = kindOf(draft);
      if (!kind) return [];
      return [
        {
          exerciseKind: kind,
          sets: parseIntegerText(draft.sets),
          reps: optionalNumber(draft.reps),
          durationS: optionalNumber(draft.duration),
          restS: parseIntegerText(draft.rest),
        },
      ];
    }),
  );
  const restDay = drafts.length === 0;

  function updateItem(index: number, change: Partial<ItemDraft>) {
    setDrafts((current) => current.map((draft, at) => (at === index ? { ...draft, ...change } : draft)));
  }

  function pickExercise(index: number, exerciseId: string) {
    const kind = byId.get(exerciseId)?.kind;
    setDrafts((current) =>
      current.map((draft, at) => {
        if (at !== index) return draft;
        return {
          ...draft,
          exerciseId,
          reps: kind === "reps" && draft.reps === "" ? DEFAULT_REPS : draft.reps,
          duration: kind === "timed" && draft.duration === "" ? DEFAULT_DURATION : draft.duration,
        };
      }),
    );
  }

  function addItem() {
    newKey.current += 1;
    setDrafts((current) => [
      ...current,
      {
        localKey: `new-${newKey.current}`,
        id: null,
        exerciseId: "",
        storedTitle: null,
        storedKind: null,
        legacyLabel: null,
        sets: DEFAULT_SETS,
        reps: "",
        duration: "",
        rest: DEFAULT_REST,
        tempo: "",
      },
    ]);
  }

  function removeItem(index: number) {
    setDrafts((current) => current.filter((_, at) => at !== index));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: SaveDayInput = {
      planId,
      dayNumber,
      title,
      builtBy,
      targetMinutes: target.trim() === "" ? null : parseIntegerText(target),
      items: drafts.map((draft) => {
        const kind = kindOf(draft);
        return {
          id: draft.id,
          exerciseId: draft.exerciseId,
          // Without an exercise the id check fails first; the kind is then never read.
          exerciseKind: kind ?? "reps",
          sets: parseIntegerText(draft.sets),
          reps: kind === "reps" ? optionalNumber(draft.reps) : null,
          durationS: kind === "timed" ? optionalNumber(draft.duration) : null,
          restS: parseIntegerText(draft.rest),
          tempo: draft.tempo,
        };
      }),
    };
    const parsed = saveDaySchema.safeParse(input);
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error, "Check the workout and try again."));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveDayAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", `Saved day ${dayNumber}.`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate aria-labelledby={`${base}-heading`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`${base}-heading`} className="text-base font-semibold">
          {day ? `Day ${dayNumber}` : `New day ${dayNumber}`}
        </h3>
        {restDay ? (
          <Badge variant="outline" className="text-muted-foreground">
            Rest day
          </Badge>
        ) : null}
      </div>
      {exercises.ok ? null : (
        <p role="alert" className="text-sm text-destructive">
          {`The exercise library did not load: ${exercises.error} Stored exercises keep their place; new ones cannot be picked until it loads.`}
        </p>
      )}
      <fieldset className="flex flex-col gap-4" disabled={pending}>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_10rem]">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${base}-title`}>Day title</Label>
            <Input
              id={`${base}-title`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={DAY_TITLE_MAX}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${base}-built-by`}>Built by</Label>
            <Input
              id={`${base}-built-by`}
              value={builtBy}
              onChange={(event) => setBuiltBy(event.target.value)}
              maxLength={DAY_BUILT_BY_MAX}
              aria-describedby={`${base}-built-by-hint`}
            />
            <p id={`${base}-built-by-hint`} className="text-xs text-muted-foreground">
              Optional; the app shows it under the day.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${base}-target`}>Target minutes</Label>
            <Input
              id={`${base}-target`}
              type="number"
              inputMode="numeric"
              min={0}
              max={DAY_TARGET_MINUTES_MAX}
              step={1}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder={String(estimate)}
              aria-describedby={`${base}-target-hint`}
            />
            <p id={`${base}-target-hint`} className="text-xs text-muted-foreground">
              {restDay
                ? "Empty counts a rest day as 0."
                : `Empty uses the estimate, ${estimate} min (a rep counts 3 seconds).`}
            </p>
          </div>
        </div>

        {restDay ? (
          <p className="text-sm text-muted-foreground">
            No exercises: clients see this day as a rest day. Add an exercise to make it a workout.
          </p>
        ) : (
          <ol className="flex flex-col gap-3" aria-label={`Exercises on day ${dayNumber}`}>
            {drafts.map((draft, index) => {
              const id = `${base}-item-${draft.localKey}`;
              const position = `item ${index + 1}`;
              const kind = kindOf(draft);
              const current = byId.get(draft.exerciseId);
              // Inactive exercises cannot be added anew; one an item already has stays pickable.
              const options = library.filter((exercise) => exercise.active || exercise.id === draft.exerciseId);
              const unlisted = draft.exerciseId !== "" && !current;
              return (
                <li key={draft.localKey} className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-tile">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${position} up`}
                        disabled={index === 0}
                        onClick={() => setDrafts((list) => moveItem(list, index, "up"))}
                      >
                        <ArrowUp size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${position} down`}
                        disabled={index === drafts.length - 1}
                        onClick={() => setDrafts((list) => moveItem(list, index, "down"))}
                      >
                        <ArrowDown size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${position}`}
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  {draft.legacyLabel && draft.exerciseId === "" ? (
                    <p className="text-xs text-warning">
                      {`Written before the exercise library as ${draft.legacyLabel}. Pick an exercise or remove it to save the day.`}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`${id}-exercise`}>Exercise</Label>
                    <Select
                      value={draft.exerciseId || undefined}
                      onValueChange={(value) => pickExercise(index, value)}
                      disabled={pending}
                    >
                      <SelectTrigger id={`${id}-exercise`} className="w-full">
                        <SelectValue placeholder="Choose an exercise" />
                      </SelectTrigger>
                      <SelectContent>
                        {unlisted ? (
                          <SelectItem value={draft.exerciseId}>
                            {`${draft.storedTitle ?? "Stored exercise"} (not in the loaded library)`}
                          </SelectItem>
                        ) : null}
                        {options.map((exercise) => (
                          <SelectItem key={exercise.id} value={exercise.id}>
                            {exerciseLabel(exercise)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${id}-sets`}>Sets</Label>
                      <Input
                        id={`${id}-sets`}
                        type="number"
                        inputMode="numeric"
                        min={ITEM_SETS_MIN}
                        max={ITEM_SETS_MAX}
                        step={1}
                        value={draft.sets}
                        onChange={(event) => updateItem(index, { sets: event.target.value })}
                        required
                      />
                    </div>
                    {kind === "timed" ? (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`${id}-duration`}>Hold (seconds)</Label>
                        <Input
                          id={`${id}-duration`}
                          type="number"
                          inputMode="numeric"
                          min={ITEM_DURATION_MIN}
                          max={ITEM_DURATION_MAX}
                          step={1}
                          value={draft.duration}
                          onChange={(event) => updateItem(index, { duration: event.target.value })}
                          required
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`${id}-reps`}>Reps</Label>
                        <Input
                          id={`${id}-reps`}
                          type="number"
                          inputMode="numeric"
                          min={ITEM_REPS_MIN}
                          max={ITEM_REPS_MAX}
                          step={1}
                          value={draft.reps}
                          onChange={(event) => updateItem(index, { reps: event.target.value })}
                          disabled={kind === null}
                          placeholder={kind === null ? "Pick first" : undefined}
                          required
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${id}-rest`}>Rest (seconds)</Label>
                      <Input
                        id={`${id}-rest`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={ITEM_REST_MAX}
                        step={1}
                        value={draft.rest}
                        onChange={(event) => updateItem(index, { rest: event.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${id}-tempo`}>Tempo</Label>
                      <Input
                        id={`${id}-tempo`}
                        value={draft.tempo}
                        onChange={(event) => updateItem(index, { tempo: event.target.value })}
                        maxLength={ITEM_TEMPO_MAX}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addItem}
            disabled={drafts.length >= DAY_ITEMS_MAX || library.length === 0}
          >
            <Plus size={16} aria-hidden="true" />
            Add exercise
          </Button>
          <p className="text-xs text-muted-foreground">
            {drafts.length >= DAY_ITEMS_MAX
              ? `A workout holds up to ${DAY_ITEMS_MAX} exercises.`
              : library.length === 0
                ? exercises.ok
                  ? "The library is empty. Add exercises in the Exercises tab first."
                  : "Exercises can be added once the library loads."
                : "Removing an exercise also removes clients' ticks on it."}
          </p>
        </div>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : `Save day ${dayNumber}`}
        </Button>
      </div>
    </form>
  );
}

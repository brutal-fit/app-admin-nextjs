"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Edit2, Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { saveExerciseAction } from "@/features/exercises/actions";
import {
  EXERCISE_CUES_MAX,
  EXERCISE_CUES_MIN,
  EXERCISE_CUE_MAX,
  EXERCISE_KEY_MAX,
  EXERCISE_KINDS,
  EXERCISE_KIND_HINTS,
  EXERCISE_KIND_LABELS,
  EXERCISE_MUSCLE_MAX,
  EXERCISE_NAME_MAX,
  EXERCISE_SORT_MAX,
  EXERCISE_VIDEO_URL_MAX,
  saveExerciseSchema,
  suggestExerciseKey,
  type SaveExerciseInput,
} from "@/features/exercises/schemas";
import {
  PROGRAMME_FIGURE_KEYS,
  PROGRAMME_FIGURE_LABELS,
  isFigureKey,
} from "@/features/programmes/schemas";
import { parseIntegerText } from "@/features/settings/schemas";
import { parseTextList } from "@/features/trainers/schemas";
import type { AdminExercise } from "@/lib/db/programmes";
import { showToast } from "@/stores/toast-store";
import type { ExerciseKind } from "@/types/database";

type Props = {
  /** Sort order a new exercise starts with (after the last one). */
  nextSortOrder: number;
} & ({ mode: "create"; exercise?: never } | { mode: "edit"; exercise: AdminExercise });

type CueDraft = { localKey: string; text: string };

function initialState(props: Props) {
  if (props.mode === "edit") {
    const exercise = props.exercise;
    return {
      name: exercise.name,
      key: exercise.key,
      muscleGroup: exercise.muscle_group,
      equipment: exercise.equipment.join(", "),
      cues: exercise.cues.map((text, index) => ({ localKey: `stored-${index}`, text })),
      kind: exercise.kind,
      videoUrl: exercise.video_url ?? "",
      // A key the panel does not know (added after this build) is kept as stored.
      figure: exercise.figure_key,
      sortOrder: String(exercise.sort_order),
      active: exercise.active,
    };
  }
  return {
    name: "",
    key: "",
    muscleGroup: "",
    equipment: "",
    cues: [
      { localKey: "new-a", text: "" },
      { localKey: "new-b", text: "" },
    ] as CueDraft[],
    kind: "reps" as ExerciseKind,
    videoUrl: "",
    figure: "",
    sortOrder: String(props.nextSortOrder),
    active: true,
  };
}

/**
 * Adds an exercise to the library or edits one in a side sheet, through admin_upsert_exercise:
 * name, key (fixed once created), muscle group, equipment, 2 to 4 form cues, kind (locked
 * once workouts use the exercise), the demo video link and the placeholder figure. The panel
 * checks the same limits as the function and shows the server's words when it refuses.
 * Gated by catalogue.manage.
 */
export function ExerciseSheet(props: Props) {
  const { mode } = props;
  const editing = mode === "edit";
  const base = editing ? `exercise-${props.exercise.id}` : "exercise-new";
  const kindLocked = editing && props.exercise.item_count > 0;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => initialState(props));
  // A new key follows the name until someone types in the key field.
  const [keyTouched, setKeyTouched] = useState(editing);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const newCueKey = useRef(0);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setForm(initialState(props));
    setKeyTouched(editing);
    setError(null);
  }

  function onNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      key: keyTouched ? current.key : suggestExerciseKey(value),
    }));
  }

  function updateCue(index: number, text: string) {
    setForm((current) => ({
      ...current,
      cues: current.cues.map((cue, at) => (at === index ? { ...cue, text } : cue)),
    }));
  }

  function addCue() {
    newCueKey.current += 1;
    const localKey = `added-${newCueKey.current}`;
    setForm((current) => ({ ...current, cues: [...current.cues, { localKey, text: "" }] }));
  }

  function removeCue(index: number) {
    setForm((current) => ({ ...current, cues: current.cues.filter((_, at) => at !== index) }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: SaveExerciseInput = {
      id: editing ? props.exercise.id : null,
      key: form.key,
      name: form.name,
      muscleGroup: form.muscleGroup,
      equipment: parseTextList(form.equipment),
      cues: form.cues.map((cue) => cue.text),
      kind: form.kind,
      videoUrl: form.videoUrl,
      figureKey: form.figure as SaveExerciseInput["figureKey"],
      sortOrder: parseIntegerText(form.sortOrder),
      active: form.active,
    };
    const parsed = saveExerciseSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the exercise and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveExerciseAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", editing ? `Saved ${parsed.data.name}.` : `Added ${parsed.data.name}.`);
      setOpen(false);
      if (!editing) reset();
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) reset();
      }}
    >
      <SheetTrigger asChild>
        {editing ? (
          <Button size="sm" variant="ghost" aria-label={`Edit ${props.exercise.name}`}>
            <Edit2 size={16} aria-hidden="true" />
            Edit
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus size={16} aria-hidden="true" />
            New exercise
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{editing ? `Edit ${props.exercise.name}` : "New exercise"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Changes reach every workout that uses this exercise the next time the app reads it."
              : "Active exercises can be added to workouts. The key cannot change later."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-4" noValidate>
          <fieldset className="flex flex-col gap-4" disabled={pending}>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-name`}>Name</Label>
              <Input
                id={`${base}-name`}
                value={form.name}
                onChange={(event) => onNameChange(event.target.value)}
                maxLength={EXERCISE_NAME_MAX}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-key`}>Key</Label>
              <Input
                id={`${base}-key`}
                value={form.key}
                onChange={(event) => {
                  setKeyTouched(true);
                  update("key", event.target.value);
                }}
                readOnly={editing}
                maxLength={EXERCISE_KEY_MAX}
                className="font-mono"
                aria-describedby={`${base}-key-hint`}
                required
              />
              <p id={`${base}-key-hint`} className="text-xs text-muted-foreground">
                {editing
                  ? "Fixed once created."
                  : "Lowercase letters, numbers and underscores; unique across the library."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${base}-muscle`}>Muscle group</Label>
                <Input
                  id={`${base}-muscle`}
                  value={form.muscleGroup}
                  onChange={(event) => update("muscleGroup", event.target.value)}
                  maxLength={EXERCISE_MUSCLE_MAX}
                  placeholder="legs"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${base}-kind`}>Kind</Label>
                <Select
                  value={form.kind}
                  onValueChange={(value) => update("kind", value as ExerciseKind)}
                  disabled={pending || kindLocked}
                >
                  <SelectTrigger id={`${base}-kind`} className="w-full" aria-describedby={`${base}-kind-hint`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXERCISE_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {EXERCISE_KIND_LABELS[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p id={`${base}-kind-hint`} className="-mt-2 text-xs text-muted-foreground">
              {kindLocked
                ? `Kind is fixed: ${props.exercise.item_count} workout ${props.exercise.item_count === 1 ? "item uses" : "items use"} this exercise.`
                : EXERCISE_KIND_HINTS[form.kind]}
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-equipment`}>Equipment</Label>
              <Input
                id={`${base}-equipment`}
                value={form.equipment}
                onChange={(event) => update("equipment", event.target.value)}
                aria-describedby={`${base}-equipment-hint`}
              />
              <p id={`${base}-equipment-hint`} className="text-xs text-muted-foreground">
                Separate with commas, up to 10. Leave empty for no equipment.
              </p>
            </div>

            <fieldset className="flex flex-col gap-2" aria-describedby={`${base}-cues-hint`}>
              <legend className="mb-2 text-sm font-medium">Form cues</legend>
              <ol className="flex flex-col gap-2">
                {form.cues.map((cue, index) => (
                  <li key={cue.localKey} className="flex items-center gap-2">
                    <Label htmlFor={`${base}-cue-${cue.localKey}`} className="sr-only">
                      {`Cue ${index + 1}`}
                    </Label>
                    <Input
                      id={`${base}-cue-${cue.localKey}`}
                      value={cue.text}
                      onChange={(event) => updateCue(index, event.target.value)}
                      maxLength={EXERCISE_CUE_MAX}
                      placeholder={`Cue ${index + 1}`}
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove cue ${index + 1}`}
                      disabled={form.cues.length <= EXERCISE_CUES_MIN}
                      onClick={() => removeCue(index)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addCue}
                  disabled={form.cues.length >= EXERCISE_CUES_MAX}
                >
                  <Plus size={16} aria-hidden="true" />
                  Add cue
                </Button>
                <p id={`${base}-cues-hint`} className="text-xs text-muted-foreground">
                  {`${EXERCISE_CUES_MIN} to ${EXERCISE_CUES_MAX} short cues; the player shows them under the video.`}
                </p>
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-video`}>Video link</Label>
              <Input
                id={`${base}-video`}
                type="url"
                inputMode="url"
                value={form.videoUrl}
                onChange={(event) => update("videoUrl", event.target.value)}
                maxLength={EXERCISE_VIDEO_URL_MAX}
                placeholder="https://"
                aria-describedby={`${base}-video-hint`}
              />
              <p id={`${base}-video-hint`} className="text-xs text-muted-foreground">
                Optional, https only. Without a link the app shows the figure with &quot;Demo video coming&quot;.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${base}-figure`}>Figure</Label>
                <Select value={form.figure || undefined} onValueChange={(value) => update("figure", value)} disabled={pending}>
                  <SelectTrigger id={`${base}-figure`} className="w-full">
                    <SelectValue placeholder="Choose a figure" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.figure !== "" && !isFigureKey(form.figure) ? (
                      <SelectItem value={form.figure}>{`${form.figure} (unknown)`}</SelectItem>
                    ) : null}
                    {PROGRAMME_FIGURE_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {PROGRAMME_FIGURE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${base}-sort`}>Sort order</Label>
                <Input
                  id={`${base}-sort`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={EXERCISE_SORT_MAX}
                  step={1}
                  value={form.sortOrder}
                  onChange={(event) => update("sortOrder", event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id={`${base}-active`}
                className="mt-0.5"
                checked={form.active}
                onCheckedChange={(checked) => update("active", checked === true)}
                aria-describedby={`${base}-active-hint`}
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor={`${base}-active`}>Active</Label>
                <p id={`${base}-active-hint`} className="text-xs text-muted-foreground">
                  Inactive exercises stay on the workouts that use them but cannot be added to new ones.
                </p>
              </div>
            </div>
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <SheetFooter className="px-0">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : editing ? "Save exercise" : "Add exercise"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

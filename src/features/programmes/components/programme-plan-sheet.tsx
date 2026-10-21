"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Edit2, Plus } from "@/components/icons";
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
import { Textarea } from "@/components/ui/textarea";
import { parseIntegerText } from "@/features/settings/schemas";
import { parseTextList } from "@/features/trainers/schemas";
import { savePlanAction } from "@/features/programmes/actions";
import {
  PLAN_DESCRIPTION_MAX,
  PLAN_PRICE_MAX,
  PLAN_PRICE_MIN,
  PLAN_SLUG_MAX,
  PLAN_SORT_MAX,
  PLAN_TAGLINE_MAX,
  PLAN_TITLE_MAX,
  PLAN_WEEKS_MAX,
  PLAN_WEEKS_MIN,
  PROGRAMME_LEVELS,
  PROGRAMME_LEVEL_LABELS,
  programmesHref,
  savePlanSchema,
  suggestPlanSlug,
  type SavePlanInput,
} from "@/features/programmes/schemas";
import type { AdminProgrammePlan, OnlineTrainerOption } from "@/lib/db/programmes";
import { showToast } from "@/stores/toast-store";
import type { ProgrammeLevel } from "@/types/database";

// Radix Select has no empty value, so "no default trainer" is this sentinel.
const NO_TRAINER = "none";

type Props = {
  trainers: readonly OnlineTrainerOption[];
  /** Why the trainer list could not load; the select then keeps the stored trainer only. */
  trainersError: string | null;
  /** Sort order a new plan starts with (after the last plan). */
  nextSortOrder: number;
} & ({ mode: "create"; plan?: never } | { mode: "edit"; plan: AdminProgrammePlan });

function initialState(props: Props) {
  if (props.mode === "edit") {
    const plan = props.plan;
    return {
      title: plan.title,
      slug: plan.slug,
      tagline: plan.tagline,
      description: plan.description,
      weeks: String(plan.weeks),
      level: plan.level,
      equipment: plan.equipment.join(", "),
      price: String(plan.weekly_price_inr),
      sortOrder: String(plan.sort_order),
      trainer: plan.default_trainer_id ?? NO_TRAINER,
      popular: plan.popular,
      active: plan.active,
    };
  }
  return {
    title: "",
    slug: "",
    tagline: "",
    description: "",
    weeks: "4",
    level: "beginner" as ProgrammeLevel,
    equipment: "",
    price: "",
    sortOrder: String(props.nextSortOrder),
    trainer: NO_TRAINER,
    popular: false,
    // A new plan has no days yet; it goes live once someone activates it.
    active: false,
  };
}

/**
 * Creates a programme plan or edits one in a side sheet, through admin_upsert_programme_plan.
 * The panel checks the same limits as the function and shows the server's words when it
 * refuses. Gated by catalogue.manage.
 */
export function ProgrammePlanSheet(props: Props) {
  const { mode, trainers, trainersError } = props;
  const editing = mode === "edit";
  const base = editing ? `plan-${props.plan.id}` : "plan-new";
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => initialState(props));
  // A new slug follows the title until someone types in the slug field.
  const [slugTouched, setSlugTouched] = useState(editing);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const storedTrainerId = editing ? props.plan.default_trainer_id : null;
  const storedTrainerMissing =
    storedTrainerId !== null && !trainers.some((trainer) => trainer.id === storedTrainerId);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setForm(initialState(props));
    setSlugTouched(editing);
    setError(null);
  }

  function onTitleChange(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugTouched ? current.slug : suggestPlanSlug(value),
    }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trainerId = form.trainer === NO_TRAINER ? null : form.trainer;
    const input: SavePlanInput = {
      id: editing ? props.plan.id : null,
      title: form.title,
      slug: form.slug,
      tagline: form.tagline,
      description: form.description,
      weeks: parseIntegerText(form.weeks),
      level: form.level,
      equipment: parseTextList(form.equipment),
      weeklyPriceInr: parseIntegerText(form.price),
      popular: form.popular,
      active: form.active,
      sortOrder: parseIntegerText(form.sortOrder),
      // Unchanged on edit: leave it out so the stored trainer is kept as it is.
      defaultTrainerId: editing && trainerId === storedTrainerId ? undefined : trainerId,
    };
    const parsed = savePlanSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the plan and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await savePlanAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", editing ? `Saved ${parsed.data.title}.` : `Created ${parsed.data.title}.`);
      setOpen(false);
      if (!editing) {
        reset();
        // A new plan has no days yet; open its day list next.
        router.push(programmesHref({ planId: result.data.id }));
      }
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
          <Button size="sm" variant="ghost" aria-label={`Edit ${props.plan.title}`}>
            <Edit2 size={16} aria-hidden="true" />
            Edit
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus size={16} aria-hidden="true" />
            New plan
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{editing ? `Edit ${props.plan.title}` : "New programme plan"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Changes reach the app the next time it reads the plans."
              : "Clients see active plans only. Write the plan's days, then activate it."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-4" noValidate>
          <fieldset className="flex flex-col gap-4" disabled={pending}>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-title`}>Title</Label>
              <Input
                id={`${base}-title`}
                value={form.title}
                onChange={(event) => onTitleChange(event.target.value)}
                maxLength={PLAN_TITLE_MAX}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-slug`}>Slug</Label>
              <Input
                id={`${base}-slug`}
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  update("slug", event.target.value);
                }}
                maxLength={PLAN_SLUG_MAX}
                className="font-mono"
                aria-describedby={`${base}-slug-hint`}
                required
              />
              <p id={`${base}-slug-hint`} className="text-xs text-muted-foreground">
                Lowercase letters, numbers and dashes; unique across plans.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-tagline`}>Tagline</Label>
              <Input
                id={`${base}-tagline`}
                value={form.tagline}
                onChange={(event) => update("tagline", event.target.value)}
                maxLength={PLAN_TAGLINE_MAX}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-description`}>Description</Label>
              <Textarea
                id={`${base}-description`}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                maxLength={PLAN_DESCRIPTION_MAX}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${base}-weeks`}>Weeks</Label>
                <Input
                  id={`${base}-weeks`}
                  type="number"
                  inputMode="numeric"
                  min={PLAN_WEEKS_MIN}
                  max={PLAN_WEEKS_MAX}
                  step={1}
                  value={form.weeks}
                  onChange={(event) => update("weeks", event.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${base}-level`}>Level</Label>
                <Select
                  value={form.level}
                  onValueChange={(value) => update("level", value as ProgrammeLevel)}
                  disabled={pending}
                >
                  <SelectTrigger id={`${base}-level`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAMME_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {PROGRAMME_LEVEL_LABELS[level]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${base}-price`}>Weekly price (INR)</Label>
                <Input
                  id={`${base}-price`}
                  type="number"
                  inputMode="numeric"
                  min={PLAN_PRICE_MIN}
                  max={PLAN_PRICE_MAX}
                  step={1}
                  value={form.price}
                  onChange={(event) => update("price", event.target.value)}
                  aria-describedby={`${base}-price-hint`}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${base}-sort`}>Sort order</Label>
                <Input
                  id={`${base}-sort`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={PLAN_SORT_MAX}
                  step={1}
                  value={form.sortOrder}
                  onChange={(event) => update("sortOrder", event.target.value)}
                  required
                />
              </div>
            </div>
            <p id={`${base}-price-hint`} className="-mt-2 text-xs text-muted-foreground">
              Shown as the price after the pilot; enrolling is free while the pilot runs.
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
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-trainer`}>Default trainer</Label>
              <Select
                value={form.trainer}
                onValueChange={(value) => update("trainer", value)}
                disabled={pending}
              >
                <SelectTrigger id={`${base}-trainer`} className="w-full" aria-describedby={`${base}-trainer-hint`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TRAINER}>No default trainer</SelectItem>
                  {storedTrainerMissing && storedTrainerId ? (
                    <SelectItem value={storedTrainerId}>
                      {`${(editing && props.plan.default_trainer_name) || "Current trainer"} (not coaching online now)`}
                    </SelectItem>
                  ) : null}
                  {trainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id={`${base}-trainer-hint`} className="text-xs text-muted-foreground">
                {trainersError
                  ? `The trainer list did not load: ${trainersError}`
                  : "Each new enrolment gets this trainer. Only listed trainers who coach online can be picked."}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id={`${base}-popular`}
                className="mt-0.5"
                checked={form.popular}
                onCheckedChange={(checked) => update("popular", checked === true)}
              />
              <Label htmlFor={`${base}-popular`}>Mark as popular</Label>
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
                  Clients see and enrol in active plans only.
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
              {pending ? "Saving..." : editing ? "Save plan" : "Create plan"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

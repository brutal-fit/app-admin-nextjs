"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateTrainerProfileAction } from "@/features/trainers/actions";
import { CataloguePicker } from "@/features/trainers/components/catalogue-picker";
import {
  BIO_MAX,
  HEADLINE_MAX,
  LIST_MAX_ITEMS,
  SERVICE_AREA_MAX,
  YEARS_MAX,
  trainerProfileFieldsSchema,
  type CatalogueOptions,
  type TrainerProfileFieldsInput,
} from "@/features/trainers/schemas";
import { showToast } from "@/stores/toast-store";
import type { TrainerProfileRow } from "@/types/database";

export type TrainerProfileValues = Pick<
  TrainerProfileRow,
  "headline" | "bio" | "years_experience" | "specialties" | "languages" | "service_area"
>;

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/** Only the fields that differ from what the server stored, so the audit names real changes. */
function changedFields(
  initial: TrainerProfileValues,
  form: FormData,
  lists: { specialties: string[]; languages: string[] },
): TrainerProfileFieldsInput {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const fields: TrainerProfileFieldsInput = {};
  const headline = text("headline");
  if (headline !== initial.headline.trim()) fields.headline = headline;
  const bio = text("bio");
  if (bio !== initial.bio.trim()) fields.bio = bio;
  const yearsText = text("years_experience");
  const years = yearsText === "" ? Number.NaN : Number(yearsText);
  if (years !== initial.years_experience) fields.years_experience = years;
  const serviceArea = text("service_area");
  if (serviceArea !== initial.service_area.trim()) fields.service_area = serviceArea;
  if (!sameList(lists.specialties, initial.specialties)) fields.specialties = lists.specialties;
  if (!sameList(lists.languages, initial.languages)) fields.languages = lists.languages;
  return fields;
}

/**
 * The public profile ops can correct after approval: headline, bio, years, specialties,
 * languages and service area, sent to admin_update_trainer_profile. Specialties and
 * languages are picked from the active catalogue (free text when it has no items or cannot
 * be read). Gated by trainers.edit; after a save the page re-renders with what the server
 * stored.
 */
export function TrainerProfileForm({
  trainerId,
  initial,
  specialtyOptions,
  languageOptions,
}: {
  trainerId: string;
  initial: TrainerProfileValues;
  specialtyOptions: CatalogueOptions;
  languageOptions: CatalogueOptions;
}) {
  const [specialties, setSpecialties] = useState<string[]>(() => [...initial.specialties]);
  const [languages, setLanguages] = useState<string[]>(() => [...initial.languages]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = changedFields(initial, new FormData(event.currentTarget), { specialties, languages });
    if (Object.keys(fields).length === 0) {
      setError("Nothing changed.");
      return;
    }
    const parsed = trainerProfileFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the profile and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateTrainerProfileAction({ trainerId, fields });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", "Profile saved.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-5" noValidate>
      <fieldset className="flex flex-col gap-5" disabled={pending}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="trainer-headline">Headline</Label>
          <Input
            id="trainer-headline"
            name="headline"
            defaultValue={initial.headline}
            maxLength={HEADLINE_MAX}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="trainer-bio">Bio</Label>
          <Textarea id="trainer-bio" name="bio" defaultValue={initial.bio} maxLength={BIO_MAX} rows={5} />
          <p className="text-xs text-muted-foreground">Up to {BIO_MAX} characters.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="trainer-years">Years of experience</Label>
            <Input
              id="trainer-years"
              name="years_experience"
              type="number"
              inputMode="numeric"
              min={0}
              max={YEARS_MAX}
              step={1}
              defaultValue={initial.years_experience}
              className="w-32"
            />
          </div>
          <div className="flex min-w-64 flex-1 flex-col gap-2">
            <Label htmlFor="trainer-area">Service area</Label>
            <Input
              id="trainer-area"
              name="service_area"
              defaultValue={initial.service_area}
              maxLength={SERVICE_AREA_MAX}
              aria-describedby="trainer-area-hint"
            />
            <p id="trainer-area-hint" className="text-xs text-muted-foreground">
              Shown on the listing; never an address.
            </p>
          </div>
        </div>
        <CataloguePicker
          id="trainer-specialties"
          label="Specialties"
          catalogue={specialtyOptions}
          value={specialties}
          onChange={setSpecialties}
          disabled={pending}
          maxItems={LIST_MAX_ITEMS}
        />
        <CataloguePicker
          id="trainer-languages"
          label="Languages"
          catalogue={languageOptions}
          value={languages}
          onChange={setLanguages}
          disabled={pending}
          maxItems={LIST_MAX_ITEMS}
        />
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

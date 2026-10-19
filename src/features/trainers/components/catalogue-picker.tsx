"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinList } from "@/features/trainers/format";
import { parseTextList, type CatalogueOptions } from "@/features/trainers/schemas";

const lower = (value: string) => value.trim().toLowerCase();

/**
 * Picks specialties or languages from the catalogue. Values the trainer already has that the
 * catalogue does not list stay checked and marked, so saving never drops them silently.
 * Without catalogue items it is the comma-separated text field it replaced.
 */
export function CataloguePicker({
  id,
  label,
  catalogue,
  value,
  onChange,
  disabled,
  maxItems,
}: {
  id: string;
  label: string;
  catalogue: CatalogueOptions;
  value: readonly string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  maxItems: number;
}) {
  const [text, setText] = useState(() => joinList(value));

  if (catalogue.options === null) {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={text}
          disabled={disabled}
          onChange={(event) => {
            setText(event.target.value);
            onChange(parseTextList(event.target.value));
          }}
          aria-describedby={`${id}-hint`}
        />
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          Separate with commas, 1 to {maxItems}. {catalogue.reason}
        </p>
      </div>
    );
  }

  const options = catalogue.options;
  const optionKeys = new Set(options.map(lower));
  const chosen = new Set(value.map(lower));
  const extras = value.filter((item) => !optionKeys.has(lower(item)));

  function toggle(item: string, checked: boolean) {
    if (checked) {
      if (!chosen.has(lower(item))) onChange([...value, item]);
      return;
    }
    onChange(value.filter((entry) => lower(entry) !== lower(item)));
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled} aria-describedby={`${id}-hint`}>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option, index) => {
          const optionId = `${id}-${index}`;
          return (
            <div key={option} className="flex items-center gap-2">
              <Checkbox
                id={optionId}
                checked={chosen.has(lower(option))}
                onCheckedChange={(checked) => toggle(option, checked === true)}
              />
              <Label htmlFor={optionId} className="font-normal">
                {option}
              </Label>
            </div>
          );
        })}
        {extras.map((extra, index) => {
          const extraId = `${id}-extra-${index}`;
          return (
            <div key={`extra-${extra}`} className="flex items-center gap-2">
              <Checkbox id={extraId} checked onCheckedChange={(checked) => toggle(extra, checked === true)} />
              <Label htmlFor={extraId} className="font-normal">
                {extra} <span className="text-muted-foreground">(not in the catalogue)</span>
              </Label>
            </div>
          );
        })}
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        From the catalogue; choose 1 to {maxItems}.
      </p>
    </fieldset>
  );
}

"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Edit2, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveCatalogueItemAction } from "@/features/catalogue/actions";
import {
  CATALOGUE_KEY_MAX,
  CATALOGUE_KIND_LABELS,
  CATALOGUE_LABEL_MAX,
  saveCatalogueItemSchema,
  suggestCatalogueKey,
  type SaveCatalogueItemInput,
} from "@/features/catalogue/schemas";
import { showToast } from "@/stores/toast-store";
import type { CatalogueItemRow, CatalogueKind } from "@/types/database";

export type CityOption = { key: string; label: string; active: boolean };

type Props = {
  kind: CatalogueKind;
  cities: readonly CityOption[];
} & (
  | { mode: "create"; defaultParentKey?: string | null; item?: never }
  | { mode: "edit"; item: CatalogueItemRow; defaultParentKey?: never }
);

/**
 * Adds an item to a catalogue list or edits one, through admin_upsert_catalogue_item. The
 * key is the stable identifier and is fixed once created; the label is what the app shows.
 * An area names its city. Gated by catalogue.manage.
 */
export function CatalogueItemDialog(props: Props) {
  const { kind, cities, mode } = props;
  const editing = mode === "edit";
  const singular = CATALOGUE_KIND_LABELS[kind].singular;
  const base = editing ? `catalogue-${props.item.id}` : `catalogue-new-${kind}-${props.defaultParentKey ?? "none"}`;

  const initial = {
    label: editing ? props.item.label : "",
    key: editing ? props.item.key : "",
    parentKey: editing ? props.item.parent_key : (props.defaultParentKey ?? null),
    active: editing ? props.item.active : true,
  };

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(initial.label);
  const [key, setKey] = useState(initial.key);
  // A new key follows the label until someone types in the key field.
  const [keyTouched, setKeyTouched] = useState(editing);
  const [parentKey, setParentKey] = useState<string | null>(initial.parentKey);
  const [active, setActive] = useState(initial.active);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setLabel(initial.label);
    setKey(initial.key);
    setKeyTouched(editing);
    setParentKey(initial.parentKey);
    setActive(initial.active);
    setError(null);
  }

  function onLabelChange(value: string) {
    setLabel(value);
    if (!keyTouched) setKey(suggestCatalogueKey(value));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: SaveCatalogueItemInput = {
      mode,
      kind,
      key,
      label,
      parentKey: kind === "area" ? parentKey : null,
      active,
    };
    const parsed = saveCatalogueItemSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the item and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveCatalogueItemAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", editing ? `Saved ${parsed.data.label}.` : `Added ${parsed.data.label}.`);
      setOpen(false);
      if (!editing) reset();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) reset();
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button size="sm" variant="ghost" aria-label={`Edit ${props.item.label}`}>
            <Edit2 size={16} aria-hidden="true" />
            Edit
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus size={16} aria-hidden="true" />
            Add {singular}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${singular}` : `Add a ${singular}`}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes reach the app the next time it reads the catalogue. The key stays as it is."
              : "The app lists active items in the order shown here. The key cannot change later."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <fieldset className="flex flex-col gap-4" disabled={pending}>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-label`}>Label</Label>
              <Input
                id={`${base}-label`}
                value={label}
                onChange={(event) => onLabelChange(event.target.value)}
                maxLength={CATALOGUE_LABEL_MAX}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-key`}>Key</Label>
              <Input
                id={`${base}-key`}
                value={key}
                onChange={(event) => {
                  setKeyTouched(true);
                  setKey(event.target.value);
                }}
                readOnly={editing}
                maxLength={CATALOGUE_KEY_MAX}
                className="font-mono"
                aria-describedby={`${base}-key-hint`}
                required
              />
              <p id={`${base}-key-hint`} className="text-xs text-muted-foreground">
                {editing
                  ? "Fixed once created; profiles and applications may refer to it."
                  : "Lowercase letters, numbers and underscores."}
              </p>
            </div>
            {kind === "area" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${base}-city`}>City</Label>
                <Select value={parentKey ?? undefined} onValueChange={setParentKey} disabled={pending}>
                  <SelectTrigger id={`${base}-city`} className="w-full">
                    <SelectValue placeholder="Choose a city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.key} value={city.key}>
                        {city.active ? city.label : `${city.label} (inactive)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="flex items-start gap-2">
              <Checkbox
                id={`${base}-active`}
                className="mt-0.5"
                checked={active}
                onCheckedChange={(checked) => setActive(checked === true)}
                aria-describedby={`${base}-active-hint`}
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor={`${base}-active`}>Active</Label>
                <p id={`${base}-active-hint`} className="text-xs text-muted-foreground">
                  Inactive items stay here but the app no longer offers them.
                </p>
              </div>
            </div>
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : editing ? "Save" : `Add ${singular}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

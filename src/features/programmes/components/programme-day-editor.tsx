"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "@/components/icons";
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
import { Textarea } from "@/components/ui/textarea";
import { moveItem } from "@/features/catalogue/schemas";
import { saveDayAction } from "@/features/programmes/actions";
import {
  DAY_BUILT_BY_MAX,
  DAY_ITEMS_MAX,
  DAY_TITLE_MAX,
  ITEM_DETAIL_MAX,
  ITEM_MINUTES_MAX,
  ITEM_TITLE_MAX,
  PROGRAMME_FIGURE_KEYS,
  PROGRAMME_FIGURE_LABELS,
  PROGRAMME_ITEM_KINDS,
  PROGRAMME_ITEM_KIND_LABELS,
  firstIssueMessage,
  isFigureKey,
  saveDaySchema,
  type SaveDayInput,
} from "@/features/programmes/schemas";
import { parseIntegerText } from "@/features/settings/schemas";
import { showToast } from "@/stores/toast-store";
import type { ProgrammeDayRow, ProgrammeItemKind, ProgrammeItemRow } from "@/types/database";

// Radix Select has no empty value, so "no figure" is this sentinel.
const NO_FIGURE = "none";

type ItemDraft = {
  /** Stable React key; the server id for stored items. */
  localKey: string;
  id: string | null;
  kind: ProgrammeItemKind;
  title: string;
  detail: string;
  minutes: string;
  figure: string;
};

function toDraft(item: ProgrammeItemRow): ItemDraft {
  return {
    localKey: item.id,
    id: item.id,
    kind: item.kind,
    title: item.title,
    detail: item.detail,
    minutes: item.minutes === null ? "" : String(item.minutes),
    // A key the panel does not know (added after this build) is kept as stored.
    figure: item.figure_key ?? NO_FIGURE,
  };
}

/**
 * One day of a plan: title, "built by" and its items (kind, title, detail, minutes and the
 * person figure the app draws), in order. Save writes the whole day through
 * admin_upsert_programme_day; items removed here are deleted with clients' ticks on them.
 * Gated by catalogue.manage.
 */
export function ProgrammeDayEditor({
  planId,
  dayNumber,
  day,
  items,
}: {
  planId: string;
  dayNumber: number;
  /** Null for a day not written yet. */
  day: ProgrammeDayRow | null;
  items: readonly ProgrammeItemRow[];
}) {
  const base = `day-${planId}-${dayNumber}`;
  const [title, setTitle] = useState(day?.title ?? "");
  const [builtBy, setBuiltBy] = useState(day?.built_by ?? "");
  const [drafts, setDrafts] = useState<ItemDraft[]>(() => items.map(toDraft));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const newKey = useRef(0);

  function updateItem(index: number, change: Partial<ItemDraft>) {
    setDrafts((current) => current.map((draft, at) => (at === index ? { ...draft, ...change } : draft)));
  }

  function addItem() {
    newKey.current += 1;
    setDrafts((current) => [
      ...current,
      {
        localKey: `new-${newKey.current}`,
        id: null,
        kind: "workout",
        title: "",
        detail: "",
        minutes: "",
        figure: NO_FIGURE,
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
      items: drafts.map((draft) => ({
        id: draft.id,
        kind: draft.kind,
        title: draft.title,
        detail: draft.detail,
        minutes: draft.minutes.trim() === "" ? null : parseIntegerText(draft.minutes),
        figureKey: draft.figure === NO_FIGURE ? null : (draft.figure as SaveDayInput["items"][number]["figureKey"]),
      })),
    };
    const parsed = saveDaySchema.safeParse(input);
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error, "Check the day and try again."));
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
      <h3 id={`${base}-heading`} className="text-base font-semibold">
        {day ? `Day ${dayNumber}` : `New day ${dayNumber}`}
      </h3>
      <fieldset className="flex flex-col gap-4" disabled={pending}>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items on this day yet.</p>
        ) : (
          <ol className="flex flex-col gap-3" aria-label={`Items on day ${dayNumber}`}>
            {drafts.map((draft, index) => {
              const id = `${base}-item-${draft.localKey}`;
              const position = `item ${index + 1}`;
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
                        onClick={() => setDrafts((current) => moveItem(current, index, "up"))}
                      >
                        <ArrowUp size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${position} down`}
                        disabled={index === drafts.length - 1}
                        onClick={() => setDrafts((current) => moveItem(current, index, "down"))}
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
                  <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${id}-kind`}>Kind</Label>
                      <Select
                        value={draft.kind}
                        onValueChange={(value) => updateItem(index, { kind: value as ProgrammeItemKind })}
                        disabled={pending}
                      >
                        <SelectTrigger id={`${id}-kind`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRAMME_ITEM_KINDS.map((kind) => (
                            <SelectItem key={kind} value={kind}>
                              {PROGRAMME_ITEM_KIND_LABELS[kind]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${id}-title`}>Title</Label>
                      <Input
                        id={`${id}-title`}
                        value={draft.title}
                        onChange={(event) => updateItem(index, { title: event.target.value })}
                        maxLength={ITEM_TITLE_MAX}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`${id}-detail`}>Detail</Label>
                    <Textarea
                      id={`${id}-detail`}
                      value={draft.detail}
                      onChange={(event) => updateItem(index, { detail: event.target.value })}
                      maxLength={ITEM_DETAIL_MAX}
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${id}-minutes`}>Minutes</Label>
                      <Input
                        id={`${id}-minutes`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={ITEM_MINUTES_MAX}
                        step={1}
                        value={draft.minutes}
                        onChange={(event) => updateItem(index, { minutes: event.target.value })}
                        placeholder="None"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`${id}-figure`}>Figure</Label>
                      <Select
                        value={draft.figure}
                        onValueChange={(value) => updateItem(index, { figure: value })}
                        disabled={pending}
                      >
                        <SelectTrigger id={`${id}-figure`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_FIGURE}>No figure</SelectItem>
                          {draft.figure !== NO_FIGURE && !isFigureKey(draft.figure) ? (
                            <SelectItem value={draft.figure}>{`${draft.figure} (unknown)`}</SelectItem>
                          ) : null}
                          {PROGRAMME_FIGURE_KEYS.map((key) => (
                            <SelectItem key={key} value={key}>
                              {PROGRAMME_FIGURE_LABELS[key]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" variant="outline" onClick={addItem} disabled={drafts.length >= DAY_ITEMS_MAX}>
            <Plus size={16} aria-hidden="true" />
            Add item
          </Button>
          <p className="text-xs text-muted-foreground">
            {drafts.length >= DAY_ITEMS_MAX
              ? `A day holds up to ${DAY_ITEMS_MAX} items.`
              : "Removing an item also removes clients' ticks on it."}
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

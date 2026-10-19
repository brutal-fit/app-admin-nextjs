"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "@/components/icons";
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
import { formatInr } from "@/features/applications/format";
import { MODE_LABELS } from "@/features/applications/schemas";
import { setServicesAction } from "@/features/trainers/actions";
import {
  DURATION_MAX,
  DURATION_MIN,
  SERVICE_PRICE_MAX,
  SERVICE_PRICE_MIN,
  SERVICE_TITLE_MAX,
  SESSION_MODES,
  setServicesSchema,
} from "@/features/trainers/schemas";
import { showToast } from "@/stores/toast-store";
import type { ServiceRow, SessionMode } from "@/types/database";

type Draft = {
  /** Stable React key; the saved id when there is one. */
  key: string;
  id: string | null;
  title: string;
  mode: SessionMode;
  duration: string;
  price: string;
  active: boolean;
};

const DEFAULT_DURATION = 60;

function toDraft(service: ServiceRow): Draft {
  return {
    key: service.id,
    id: service.id,
    title: service.title,
    mode: service.mode,
    duration: String(service.duration_minutes),
    price: String(service.price_inr),
    active: service.active,
  };
}

/** Empty stays NaN so Zod reports the field instead of sending a zero. */
function toNumber(value: string): number {
  const trimmed = value.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

/**
 * The trainer's services with their platform prices: edit title, mode, length and price, add
 * a service for a mode that has none, or deactivate one (services are never deleted; bookings
 * reference them). Saving sends the whole list to admin_set_services, which sets the listing
 * price per mode to the lowest active price. Existing bookings keep the price they were made
 * at. Gated by trainers.edit.
 */
export function ServicesEditor({
  trainerId,
  services,
  approvedHomeRateInr,
  approvedOnlineRateInr,
}: {
  trainerId: string;
  services: ServiceRow[];
  approvedHomeRateInr: number | null;
  approvedOnlineRateInr: number | null;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => services.map(toDraft));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [nextKey, setNextKey] = useState(0);

  const usedModes = new Set(drafts.map((draft) => draft.mode));
  const freeMode = SESSION_MODES.find((mode) => !usedModes.has(mode)) ?? null;

  function update(key: string, change: Partial<Draft>) {
    setDrafts((previous) => previous.map((draft) => (draft.key === key ? { ...draft, ...change } : draft)));
  }

  function add() {
    if (!freeMode) return;
    setDrafts((previous) => [
      ...previous,
      {
        key: `new-${nextKey}`,
        id: null,
        title: "",
        mode: freeMode,
        duration: String(DEFAULT_DURATION),
        price: "",
        active: true,
      },
    ]);
    setNextKey((value) => value + 1);
  }

  function remove(key: string) {
    setDrafts((previous) => previous.filter((draft) => draft.key !== key || draft.id !== null));
  }

  function save() {
    const input = {
      trainerId,
      services: drafts.map((draft) => ({
        id: draft.id,
        title: draft.title,
        mode: draft.mode,
        duration_minutes: toNumber(draft.duration),
        price_inr: toNumber(draft.price),
        active: draft.active,
      })),
    };
    const parsed = setServicesSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the services and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setServicesAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", "Services saved. Listing prices follow the active services.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid max-w-md grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Listing price, home</dt>
        <dd className="tabular-nums">{formatInr(approvedHomeRateInr)}</dd>
        <dt className="text-muted-foreground">Listing price, online</dt>
        <dd className="tabular-nums">{formatInr(approvedOnlineRateInr)}</dd>
      </dl>
      <p className="max-w-3xl text-xs text-muted-foreground">
        The listing price per mode is the lowest active service price, worked out by the server
        when you save. Bookings already made keep the price they were made at. A changed price
        asks the trainer to acknowledge it again.
      </p>

      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">This trainer has no services yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {drafts.map((draft) => {
            const base = `service-${draft.key}`;
            return (
              <li
                key={draft.key}
                className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3 shadow-tile"
              >
                <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                  <Label htmlFor={`${base}-title`}>Title</Label>
                  <Input
                    id={`${base}-title`}
                    value={draft.title}
                    maxLength={SERVICE_TITLE_MAX}
                    disabled={pending}
                    onChange={(event) => update(draft.key, { title: event.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${base}-mode`}>Mode</Label>
                  <Select
                    value={draft.mode}
                    onValueChange={(value) => update(draft.key, { mode: value as SessionMode })}
                    disabled={pending}
                  >
                    <SelectTrigger id={`${base}-mode`} className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {MODE_LABELS[mode]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${base}-duration`}>Minutes</Label>
                  <Input
                    id={`${base}-duration`}
                    type="number"
                    inputMode="numeric"
                    min={DURATION_MIN}
                    max={DURATION_MAX}
                    step={5}
                    value={draft.duration}
                    disabled={pending}
                    onChange={(event) => update(draft.key, { duration: event.target.value })}
                    className="w-24"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${base}-price`}>Price (INR)</Label>
                  <Input
                    id={`${base}-price`}
                    type="number"
                    inputMode="numeric"
                    min={SERVICE_PRICE_MIN}
                    max={SERVICE_PRICE_MAX}
                    step={1}
                    value={draft.price}
                    disabled={pending}
                    onChange={(event) => update(draft.key, { price: event.target.value })}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Checkbox
                    id={`${base}-active`}
                    checked={draft.active}
                    disabled={pending}
                    onCheckedChange={(checked) => update(draft.key, { active: checked === true })}
                  />
                  <Label htmlFor={`${base}-active`}>Active</Label>
                </div>
                {draft.id === null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => remove(draft.key)}
                    aria-label="Remove this unsaved service"
                  >
                    <X size={16} aria-hidden="true" />
                    Remove
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={add} disabled={pending || !freeMode}>
          <Plus size={16} aria-hidden="true" />
          Add service
        </Button>
        {!freeMode ? (
          <span className="text-xs text-muted-foreground">
            One service per mode; both modes have one. Deactivate a service instead of adding.
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save services"}
        </Button>
      </div>
    </div>
  );
}

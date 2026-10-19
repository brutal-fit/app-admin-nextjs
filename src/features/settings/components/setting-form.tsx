"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/features/applications/format";
import { setSettingAction } from "@/features/settings/actions";
import type { SettingEntry } from "@/features/settings/api";
import {
  POLICY_COPY_LABELS,
  POLICY_COPY_MAX,
  POLICY_COPY_PARTS,
  parseIntegerListText,
  parseIntegerText,
  setSettingSchema,
  storedSettingValue,
  type PolicyCopyPart,
  type SetSettingInput,
} from "@/features/settings/schemas";
import { showToast } from "@/stores/toast-store";

type Draft =
  | { input: "integer"; text: string }
  | { input: "integer_list"; text: string }
  | { input: "policy_copy"; parts: Record<PolicyCopyPart, string> }
  | { input: "phone"; text: string };

function initialDraft(entry: SettingEntry): Draft {
  const { key, input } = entry.definition;
  switch (input) {
    case "integer": {
      const value =
        key === "booking.cancellation_window_hours" || key === "trainer.max_rate_inr"
          ? storedSettingValue(key, entry.value)
          : null;
      return { input, text: value === null ? "" : String(value) };
    }
    case "integer_list": {
      const value = storedSettingValue("booking.session_durations", entry.value);
      return { input, text: value === null ? "" : value.join(", ") };
    }
    case "policy_copy": {
      const value = storedSettingValue("booking.policy_copy", entry.value);
      return { input, parts: value ?? { home: "", online: "", cancellation: "" } };
    }
    case "phone": {
      const value = storedSettingValue("support.emergency_number", entry.value);
      return { input, text: value ?? "" };
    }
  }
}

function toInput(key: SettingEntry["definition"]["key"], draft: Draft): SetSettingInput | null {
  switch (draft.input) {
    case "integer":
      if (key === "booking.cancellation_window_hours" || key === "trainer.max_rate_inr") {
        return { key, value: parseIntegerText(draft.text) };
      }
      return null;
    case "integer_list":
      return key === "booking.session_durations"
        ? { key, value: parseIntegerListText(draft.text) }
        : null;
    case "policy_copy":
      return key === "booking.policy_copy" ? { key, value: draft.parts } : null;
    case "phone":
      return key === "support.emergency_number" ? { key, value: draft.text } : null;
  }
}

/**
 * One platform setting with its description and rule, saved on its own through
 * admin_set_setting. The same checks run here first; the server's answer is what shows when
 * it disagrees. Gated by catalogue.manage.
 */
export function SettingForm({ entry }: { entry: SettingEntry }) {
  const { definition } = entry;
  const base = `setting-${definition.key.replace(/[^a-z0-9]+/g, "-")}`;
  const [draft, setDraft] = useState<Draft>(() => initialDraft(entry));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unknownShape = entry.value !== null && storedSettingValue(definition.key, entry.value) === null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = toInput(definition.key, draft);
    const parsed = input ? setSettingSchema.safeParse(input) : null;
    if (!input || !parsed || !parsed.success) {
      setError(parsed?.error?.issues[0]?.message ?? "That value is not valid.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setSettingAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", `${definition.label} saved.`);
    });
  }

  const describedBy = `${base}-rule${error ? ` ${base}-error` : ""}`;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-labelledby={`${base}-title`}
      className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-tile"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${base}-title`} className="font-semibold">
          {definition.label}
        </h2>
        <p className="text-sm text-muted-foreground">{entry.description}</p>
        <p className="font-mono text-xs text-muted-foreground">{definition.key}</p>
      </div>

      <fieldset className="flex flex-col gap-3" disabled={pending}>
        {draft.input === "policy_copy" ? (
          POLICY_COPY_PARTS.map((part) => (
            <div key={part} className="flex flex-col gap-2">
              <Label htmlFor={`${base}-${part}`}>{POLICY_COPY_LABELS[part]}</Label>
              <Textarea
                id={`${base}-${part}`}
                value={draft.parts[part]}
                maxLength={POLICY_COPY_MAX}
                rows={3}
                aria-describedby={describedBy}
                onChange={(event) =>
                  setDraft({ input: "policy_copy", parts: { ...draft.parts, [part]: event.target.value } })
                }
              />
            </div>
          ))
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${base}-value`}>
              {definition.label}
              {definition.unit ? ` (${definition.unit})` : ""}
            </Label>
            <Input
              id={`${base}-value`}
              value={draft.text}
              inputMode={draft.input === "integer" ? "numeric" : draft.input === "phone" ? "tel" : "text"}
              className={draft.input === "integer" ? "w-40" : "max-w-sm"}
              aria-describedby={describedBy}
              onChange={(event) => setDraft({ ...draft, text: event.target.value })}
            />
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p id={`${base}-rule`}>{definition.rule}</p>
        {entry.value === null ? (
          <p>Not set yet: the app uses its built-in default until this is saved.</p>
        ) : unknownShape ? (
          <p>The stored value has a shape this form does not know; saving replaces it.</p>
        ) : null}
        {entry.updatedAt ? (
          <p>
            Last changed {formatDateTime(entry.updatedAt)}
            {entry.updatedByName ? ` by ${entry.updatedByName}` : ""}.
          </p>
        ) : null}
      </div>

      {error ? (
        <p id={`${base}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRICE_MAX_INR, PRICE_MIN_INR } from "@/features/applications/schemas";
import { saveGymServiceAction } from "@/features/my-gym/actions";
import { platformPriceText } from "@/features/my-gym/format";
import {
  DURATION_MAX,
  DURATION_MIN,
  SERVICE_TITLE_MAX,
  gymServiceFormSchema,
} from "@/features/my-gym/schemas";
import type { GymService } from "@/lib/db/gyms-manager";
import { showToast } from "@/stores/toast-store";

const MODE_LABELS = { home: "At the gym", online: "Online" } as const;

function numberOrNaN(value: FormDataEntryValue | null): number {
  const text = String(value ?? "").trim();
  return text === "" ? Number.NaN : Number(text);
}

/** One service row (or the new-service row when `service` is null), saved on its own. */
function ServiceForm({ gymId, service }: { gymId: string; service: GymService | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState(service?.active ?? true);
  const [mode, setMode] = useState<"home" | "online">(service?.mode ?? "home");
  const base = service ? `gym-service-${service.id}` : "gym-service-new";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input = {
      gymId,
      serviceId: service?.id ?? null,
      title: String(form.get("title") ?? ""),
      mode,
      durationMinutes: numberOrNaN(form.get("duration")),
      askInr: numberOrNaN(form.get("ask")),
      active,
    };
    const parsed = gymServiceFormSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the service.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveGymServiceAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", service ? `${parsed.data.title} saved.` : `${parsed.data.title} added.`);
      if (!service) {
        formElement.reset();
        setMode("home");
        setActive(true);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 px-4 py-4" noValidate aria-label={service ? service.title : "New service"}>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${base}-title`}>Title</Label>
          <Input
            id={`${base}-title`}
            name="title"
            defaultValue={service?.title ?? ""}
            maxLength={SERVICE_TITLE_MAX}
            required
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${base}-mode`}>Where</Label>
          <Select value={mode} onValueChange={(value) => setMode(value === "online" ? "online" : "home")} disabled={pending}>
            <SelectTrigger id={`${base}-mode`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">{MODE_LABELS.home}</SelectItem>
              <SelectItem value="online">{MODE_LABELS.online}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${base}-duration`}>Minutes</Label>
          <Input
            id={`${base}-duration`}
            name="duration"
            type="number"
            inputMode="numeric"
            min={DURATION_MIN}
            max={DURATION_MAX}
            step={5}
            defaultValue={service?.duration_minutes ?? 60}
            required
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${base}-ask`}>Your price (INR)</Label>
          <Input
            id={`${base}-ask`}
            name="ask"
            type="number"
            inputMode="numeric"
            min={PRICE_MIN_INR}
            max={PRICE_MAX_INR}
            step={1}
            defaultValue={service?.submitted_price_inr ?? ""}
            required
            disabled={pending}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${base}-active`}
              checked={active}
              onCheckedChange={(checked) => setActive(checked === true)}
              disabled={pending}
            />
            <Label htmlFor={`${base}-active`} className="font-normal">
              Offered
            </Label>
          </div>
          {service ? (
            <span>
              <span className="text-muted-foreground">Platform price: </span>
              {service.price_inr === null ? (
                <Badge variant="outline" className="border-warning text-warning">
                  {platformPriceText(null)}
                </Badge>
              ) : (
                platformPriceText(service.price_inr)
              )}
            </span>
          ) : null}
        </div>
        <Button type="submit" variant={service ? "outline" : "default"} size="sm" disabled={pending}>
          {service ? null : <Plus size={16} aria-hidden="true" />}
          {pending ? "Saving..." : service ? "Save" : "Add service"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * The gym's services through gym_set_service. The gym sets its own price (the ask); BRUTAL
 * sets the platform price clients pay, shown read-only. A changed ask clears the platform
 * price until BRUTAL approves again, and only priced, offered services are bookable. Gated by
 * gym.self and the gym's manager row.
 */
export function MyGymServicesEditor({ gymId, services }: { gymId: string; services: readonly GymService[] }) {
  return (
    <div className="flex max-w-4xl flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Changing your price sends it to BRUTAL again; the service is not bookable until BRUTAL
        approves the new platform price.
      </p>
      <div className="flex flex-col divide-y rounded-lg border bg-card shadow-tile">
        {services.map((service) => (
          <ServiceForm
            // Restart from the server's values after each save.
            key={[service.id, service.title, service.mode, service.duration_minutes, service.submitted_price_inr, service.price_inr, service.active].join(":")}
            gymId={gymId}
            service={service}
          />
        ))}
        <ServiceForm gymId={gymId} service={null} />
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GYM_ADDRESS_MAX,
  GYM_AREA_MAX,
  GYM_DESCRIPTION_MAX,
  GYM_NAME_MAX,
  GYM_TAGLINE_MAX,
} from "@/features/gyms/schemas";
import { updateGymProfileAction } from "@/features/my-gym/actions";
import { updateGymProfileSchema } from "@/features/my-gym/schemas";
import type { Gym } from "@/lib/db/gyms-manager";
import { showToast } from "@/stores/toast-store";

const FIELDS = ["name", "tagline", "description", "addressText", "area", "city", "lat", "lng", "facilities", "phone"] as const;

function nationalDigits(phone: string | null): string {
  const match = phone ? /^\+91(\d{10})$/.exec(phone) : null;
  return match?.[1] ?? phone ?? "";
}

/**
 * The gym's profile through gym_update_profile: what clients see once BRUTAL lists the gym.
 * The map pin is latitude and longitude; sending the gym for review needs one. Gated by
 * gym.self and the gym's manager row.
 */
export function MyGymProfileForm({ gym }: { gym: Gym }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: Record<string, string> = { gymId: gym.id };
    for (const field of FIELDS) input[field] = String(form.get(field) ?? "");
    const parsed = updateGymProfileSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateGymProfileAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", "Profile saved.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="my-gym-name">Gym name</Label>
          <Input id="my-gym-name" name="name" defaultValue={gym.name} maxLength={GYM_NAME_MAX} required disabled={pending} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="my-gym-tagline">Tagline</Label>
          <Input id="my-gym-tagline" name="tagline" defaultValue={gym.tagline} maxLength={GYM_TAGLINE_MAX} disabled={pending} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="my-gym-description">Description</Label>
        <Textarea
          id="my-gym-description"
          name="description"
          defaultValue={gym.description}
          maxLength={GYM_DESCRIPTION_MAX}
          rows={4}
          disabled={pending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="my-gym-address">Address</Label>
        <Input
          id="my-gym-address"
          name="addressText"
          defaultValue={gym.address_text}
          maxLength={GYM_ADDRESS_MAX}
          required
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Clients booking a session at the gym get this address once the gym confirms.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="my-gym-area">Area</Label>
          <Input id="my-gym-area" name="area" defaultValue={gym.area} maxLength={GYM_AREA_MAX} required disabled={pending} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="my-gym-city">City</Label>
          <Input id="my-gym-city" name="city" defaultValue={gym.city} maxLength={GYM_AREA_MAX} required disabled={pending} />
        </div>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={pending}>
        <legend className="mb-2 text-sm font-medium">Map pin</legend>
        <div className="flex flex-col gap-2">
          <Label htmlFor="my-gym-lat">Latitude</Label>
          <Input id="my-gym-lat" name="lat" inputMode="decimal" defaultValue={gym.lat ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="my-gym-lng">Longitude</Label>
          <Input id="my-gym-lng" name="lng" inputMode="decimal" defaultValue={gym.lng ?? ""} />
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <Label htmlFor="my-gym-facilities">Facilities</Label>
        <Input
          id="my-gym-facilities"
          name="facilities"
          defaultValue={gym.facilities.join(", ")}
          aria-describedby="my-gym-facilities-hint"
          disabled={pending}
        />
        <p id="my-gym-facilities-hint" className="text-xs text-muted-foreground">
          Separate with commas, for example: Free weights, Showers, Parking.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="my-gym-phone">Gym phone (optional)</Label>
        <Input
          id="my-gym-phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          defaultValue={nationalDigits(gym.phone)}
          maxLength={16}
          disabled={pending}
        />
      </div>
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

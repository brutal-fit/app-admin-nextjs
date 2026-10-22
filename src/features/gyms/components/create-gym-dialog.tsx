"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
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
import { createGymAction } from "@/features/gyms/actions";
import {
  GYM_ADDRESS_MAX,
  GYM_AREA_MAX,
  GYM_NAME_MAX,
  GYM_TAGLINE_MAX,
  createGymSchema,
} from "@/features/gyms/schemas";
import { showToast } from "@/stores/toast-store";

/**
 * Creates a draft gym through admin_create_gym with its first manager invited by phone. The
 * manager joins on sign-up with that number (or on their next sign-in), fills in the profile,
 * services and hours, and sends the gym for review. Gated by gyms.manage.
 */
export function CreateGymDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("name") ?? ""),
      tagline: String(form.get("tagline") ?? ""),
      addressText: String(form.get("addressText") ?? ""),
      area: String(form.get("area") ?? ""),
      city: String(form.get("city") ?? ""),
      managerPhone: String(form.get("managerPhone") ?? ""),
    };
    const parsed = createGymSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createGymAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", `${parsed.data.name} created. Its manager is invited.`);
      setOpen(false);
      router.push(`/gyms/${result.data.gymId}`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} aria-hidden="true" />
          Create gym
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create gym</DialogTitle>
          <DialogDescription>
            The gym starts as a draft that clients cannot see. Its first manager is invited by
            mobile number and completes the profile, services and hours in this panel.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gym-name">Gym name</Label>
            <Input id="gym-name" name="name" maxLength={GYM_NAME_MAX} required disabled={pending} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gym-tagline">Tagline (optional)</Label>
            <Input id="gym-tagline" name="tagline" maxLength={GYM_TAGLINE_MAX} disabled={pending} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gym-address">Address</Label>
            <Input id="gym-address" name="addressText" maxLength={GYM_ADDRESS_MAX} required disabled={pending} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="gym-area">Area</Label>
              <Input id="gym-area" name="area" maxLength={GYM_AREA_MAX} required disabled={pending} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gym-city">City</Label>
              <Input id="gym-city" name="city" maxLength={GYM_AREA_MAX} required disabled={pending} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gym-manager-phone">Mobile number of the first manager</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground" aria-hidden="true">
                +91
              </span>
              <Input
                id="gym-manager-phone"
                name="managerPhone"
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                maxLength={16}
                required
                disabled={pending}
                aria-describedby="gym-manager-phone-hint"
              />
            </div>
            <p id="gym-manager-phone-hint" className="text-xs text-muted-foreground">
              Ten digits. To sign in here the manager also needs a panel login: create one under
              Users with this number, an email and a temporary password.
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create gym"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

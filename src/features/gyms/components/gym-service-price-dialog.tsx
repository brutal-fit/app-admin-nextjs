"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Edit2 } from "@/components/icons";
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
import { PRICE_MAX_INR, PRICE_MIN_INR } from "@/features/applications/schemas";
import { formatInr } from "@/features/applications/format";
import { setGymServicePriceAction } from "@/features/gyms/actions";
import { setGymServicePriceSchema } from "@/features/gyms/schemas";
import { showToast } from "@/stores/toast-store";

/**
 * Sets the platform price of one gym service through admin_set_gym_service_price (audited; the
 * gym's managers are told). The gym's ask is shown next to it; only a priced, active service of
 * a listed gym is bookable. Withdrawing the price stops new bookings. Gated by gyms.manage.
 */
export function GymServicePriceDialog({
  serviceId,
  serviceTitle,
  askInr,
  priceInr,
}: {
  serviceId: string;
  serviceTitle: string;
  askInr: number;
  priceInr: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(price: number | null) {
    const input = { serviceId, priceInr: price };
    const parsed = setGymServicePriceSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the price.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setGymServicePriceAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast(
        "success",
        price === null ? `Price withdrawn for ${serviceTitle}.` : `${serviceTitle} is priced at ${formatInr(price)}.`,
      );
      setOpen(false);
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = String(new FormData(event.currentTarget).get("price") ?? "").trim();
    save(raw === "" ? Number.NaN : Number(raw));
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
        <Button variant={priceInr === null ? "default" : "outline"} size="sm">
          <Edit2 size={16} aria-hidden="true" />
          Set platform price
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Platform price for {serviceTitle}</DialogTitle>
          <DialogDescription>
            The gym asks {formatInr(askInr)}. Clients pay the platform price; a booking keeps the
            price it was made at.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`gym-service-price-${serviceId}`}>Platform price (INR)</Label>
            <Input
              id={`gym-service-price-${serviceId}`}
              name="price"
              type="number"
              inputMode="numeric"
              min={PRICE_MIN_INR}
              max={PRICE_MAX_INR}
              step={1}
              defaultValue={priceInr ?? askInr}
              required
              disabled={pending}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2">
            {priceInr !== null ? (
              <Button type="button" variant="outline" onClick={() => save(null)} disabled={pending}>
                Withdraw price
              </Button>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Set price"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

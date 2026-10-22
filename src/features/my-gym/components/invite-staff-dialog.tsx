"use client";

import { useState, useTransition, type FormEvent } from "react";
import { UserPlus } from "@/components/icons";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAFF_ROLE_LABELS } from "@/features/gyms/format";
import { inviteStaffAction } from "@/features/my-gym/actions";
import { inviteStaffSchema } from "@/features/my-gym/schemas";
import { showToast } from "@/stores/toast-store";

/**
 * Invites a trainer or another manager by mobile number through gym_invite_staff. The invite
 * binds when that number signs up on BRUTAL, or on its next sign-in; a gym trainer gets a
 * gym-verified trainer profile. Gated by gym.self and the gym's manager row.
 */
export function InviteStaffDialog({ gymId }: { gymId: string }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"trainer" | "manager">("trainer");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { gymId, phone: String(new FormData(event.currentTarget).get("phone") ?? ""), role };
    const parsed = inviteStaffSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the number.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await inviteStaffAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", `${STAFF_ROLE_LABELS[role]} invited.`);
      setOpen(false);
      setRole("trainer");
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
          <UserPlus size={16} aria-hidden="true" />
          Invite by phone
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite staff</DialogTitle>
          <DialogDescription>
            They join your gym when this number signs up on BRUTAL, or the next time they sign in.
            Trainers can then be allotted to your sessions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-staff-phone">Mobile number</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground" aria-hidden="true">
                +91
              </span>
              <Input
                id="invite-staff-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                maxLength={16}
                required
                disabled={pending}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-staff-role">Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value === "manager" ? "manager" : "trainer")}
              disabled={pending}
            >
              <SelectTrigger id="invite-staff-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trainer">{STAFF_ROLE_LABELS.trainer}</SelectItem>
                <SelectItem value="manager">{STAFF_ROLE_LABELS.manager}</SelectItem>
              </SelectContent>
            </Select>
            {role === "manager" ? (
              <p className="text-xs text-muted-foreground">
                A manager can run this gym in the panel: requests, staff, services and hours.
              </p>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Inviting..." : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

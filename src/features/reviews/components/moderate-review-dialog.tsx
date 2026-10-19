"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Eye, EyeOff } from "@/components/icons";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { moderateReviewAction } from "@/features/reviews/actions";
import { MODERATION_REASON_MAX, moderateReviewSchema } from "@/features/reviews/schemas";
import { showToast } from "@/stores/toast-store";

/**
 * Hides a shown review or restores a hidden one through admin_moderate_review, with a
 * reason either way. A hidden review leaves the trainer's listing and rating; the server
 * recomputes the rating. Gated by reviews.moderate.
 */
export function ModerateReviewDialog({
  reviewId,
  authorName,
  hidden,
}: {
  reviewId: string;
  authorName: string;
  hidden: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hiding = !hidden;
  const reasonId = `moderate-reason-${reviewId}`;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      reviewId,
      hidden: hiding,
      reason: String(new FormData(event.currentTarget).get("reason") ?? ""),
    };
    const parsed = moderateReviewSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the reason and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await moderateReviewAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", hiding ? "Review hidden." : "Review restored.");
      setOpen(false);
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
        <Button size="sm" variant={hiding ? "destructive" : "outline"}>
          {hiding ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          {hiding ? "Hide" : "Restore"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hiding ? "Hide this review" : "Restore this review"}</DialogTitle>
          <DialogDescription>
            {hiding
              ? `The review by ${authorName} disappears from the trainer's listing and stops counting toward the rating. The client still sees it.`
              : `The review by ${authorName} shows on the listing again and counts toward the rating.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor={reasonId}>Reason (kept for the team)</Label>
            <Textarea
              id={reasonId}
              name="reason"
              maxLength={MODERATION_REASON_MAX}
              required
              disabled={pending}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" variant={hiding ? "destructive" : "default"} disabled={pending}>
              {pending ? "Saving..." : hiding ? "Hide review" : "Restore review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

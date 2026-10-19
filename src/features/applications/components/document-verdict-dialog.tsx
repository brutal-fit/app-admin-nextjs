"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, X } from "@/components/icons";
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
import { reviewDocumentAction } from "@/features/applications/actions";
import { showToast } from "@/stores/toast-store";

/**
 * Accept or reject one document with an optional note for the trainer. Gated by
 * documents.review; the status shown afterwards is whatever the server returns on refresh.
 */
export function DocumentVerdictDialog({
  documentId,
  fileName,
  verdict,
  disabled = false,
}: {
  documentId: string;
  fileName: string;
  verdict: "accepted" | "rejected";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const accepting = verdict === "accepted";
  const noteId = `document-note-${verdict}-${documentId}`;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await reviewDocumentAction({ documentId, status: verdict, note });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", accepting ? `Accepted ${fileName}.` : `Rejected ${fileName}.`);
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant={accepting ? "outline" : "destructive"} disabled={disabled}>
          {accepting ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
          {accepting ? "Accept" : "Reject"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{accepting ? "Accept document" : "Reject document"}</DialogTitle>
          <DialogDescription>
            {accepting
              ? `Mark ${fileName} as accepted.`
              : `Mark ${fileName} as rejected. The trainer has to upload it again before resubmitting.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor={noteId}>Note for the trainer (optional)</Label>
            <Textarea id={noteId} name="note" maxLength={500} disabled={pending} />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" variant={accepting ? "default" : "destructive"} disabled={pending}>
              {pending ? "Saving..." : accepting ? "Accept" : "Reject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

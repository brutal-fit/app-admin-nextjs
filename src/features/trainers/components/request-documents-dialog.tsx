"use client";

import { useState, useTransition, type FormEvent } from "react";
import { FileText } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DOCUMENT_KIND_LABELS } from "@/features/applications/schemas";
import { requestDocumentsAction } from "@/features/trainers/actions";
import {
  DOCUMENT_KINDS,
  REQUEST_MESSAGE_MAX,
  requestDocumentsSchema,
} from "@/features/trainers/schemas";
import { showToast } from "@/stores/toast-store";
import type { DocumentKind } from "@/types/database";

/**
 * Asks the trainer for new documents through admin_request_documents: the application moves
 * to Needs information with the message, the ticked kinds are marked rejected with the
 * message as the reason, and the trainer is notified. On an approved trainer this also takes
 * them off the listing until they resubmit and are approved again. Gated by documents.review.
 */
export function RequestDocumentsDialog({
  trainerId,
  trainerName,
}: {
  trainerId: string;
  trainerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [kinds, setKinds] = useState<ReadonlySet<DocumentKind>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(kind: DocumentKind, on: boolean) {
    setKinds((previous) => {
      const next = new Set(previous);
      if (on) next.add(kind);
      else next.delete(kind);
      return next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      trainerId,
      message: String(new FormData(event.currentTarget).get("message") ?? ""),
      kinds: DOCUMENT_KINDS.filter((kind) => kinds.has(kind)),
    };
    const parsed = requestDocumentsSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the request and try again.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await requestDocumentsAction(input);
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", `Asked ${trainerName} for documents.`);
      setOpen(false);
      setKinds(new Set());
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
        <Button variant="outline">
          <FileText size={16} aria-hidden="true" />
          Request documents
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request documents</DialogTitle>
          <DialogDescription>
            The application moves to Needs information and {trainerName} is notified with your
            message. An approved trainer leaves the listing until they resubmit and are approved
            again.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="request-documents-message">Message to the trainer</Label>
            <Textarea
              id="request-documents-message"
              name="message"
              maxLength={REQUEST_MESSAGE_MAX}
              required
              disabled={pending}
            />
          </div>
          <fieldset className="flex flex-col gap-2" disabled={pending}>
            <legend className="mb-1 text-sm font-medium">Documents to upload again (optional)</legend>
            <p className="text-xs text-muted-foreground">
              Ticked kinds are marked rejected, with the message as the reason.
            </p>
            {DOCUMENT_KINDS.map((kind) => (
              <div key={kind} className="flex items-center gap-2">
                <Checkbox
                  id={`request-kind-${kind}`}
                  checked={kinds.has(kind)}
                  onCheckedChange={(checked) => toggle(kind, checked === true)}
                />
                <Label htmlFor={`request-kind-${kind}`}>{DOCUMENT_KIND_LABELS[kind]}</Label>
              </div>
            ))}
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending..." : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

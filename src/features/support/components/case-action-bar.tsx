"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Lock, Send } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addSupportNoteAction,
  assignSupportCaseAction,
  changeSupportStatusAction,
  replySupportCaseAction,
} from "@/features/support/actions";
import type { TeamState } from "@/features/support/api";
import {
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TEXT_MAX,
  assignSupportCaseSchema,
  changeSupportStatusSchema,
  supportNoteSchema,
  supportReplySchema,
} from "@/features/support/schemas";
import { PERMISSIONS, type PermissionKey } from "@/lib/rbac/permissions";
import { showToast } from "@/stores/toast-store";
import type { ActionResult } from "@/types/action-result";
import type { SupportCaseStatus } from "@/types/database";

type Section = "status" | "assignee" | "note" | "reply";

// Radix Select cannot hold an empty value, so "nobody" has its own token.
const UNASSIGNED = "unassigned";

function permissionName(key: PermissionKey): string {
  return PERMISSIONS.find((permission) => permission.key === key)?.name ?? key;
}

/** Why a part of the bar is missing, naming the permission and its key. */
export function missingKeyMessage(key: PermissionKey, what: string): string {
  return `${what} needs the ${permissionName(key)} permission (${key}).`;
}

/**
 * The case actions: change status, assign (support.assign), add an internal note, reply to
 * the reporter. Each is a server action calling admin_update_support_case; on success the
 * page reads the case again from the server, on failure the server's message shows here.
 * Nothing changes locally first. Parts the session cannot use are not rendered; with
 * nothing available the bar says which permission is missing.
 */
export function CaseActionBar({
  caseId,
  status,
  assignee,
  canManage,
  canAssign,
  team,
}: {
  caseId: string;
  status: SupportCaseStatus;
  assignee: { id: string; name: string } | null;
  /** support.manage: status, notes and replies. */
  canManage: boolean;
  /** support.assign together with support.manage (the function checks both). */
  canAssign: boolean;
  team: TeamState | null;
}) {
  const [nextStatus, setNextStatus] = useState<SupportCaseStatus>(status);
  const [nextAssignee, setNextAssignee] = useState<string>(assignee?.id ?? UNASSIGNED);
  const [note, setNote] = useState("");
  const [reply, setReply] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Section, string>>>({});
  const [busy, setBusy] = useState<Section | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canManage) {
    return (
      <section aria-labelledby="case-actions" className="flex flex-col gap-2">
        <h2 id="case-actions" className="text-lg font-semibold">
          Actions
        </h2>
        <p className="text-sm text-muted-foreground">
          {missingKeyMessage("support.manage", "Changing the status, adding notes and replying")}
        </p>
      </section>
    );
  }

  function submit(
    section: Section,
    validation: { success: boolean; error?: { issues: { message: string }[] } },
    run: () => Promise<ActionResult>,
    success: string,
  ) {
    if (!validation.success) {
      setErrors((previous) => ({
        ...previous,
        [section]: validation.error?.issues[0]?.message ?? "Check the input and try again.",
      }));
      return;
    }
    setErrors((previous) => ({ ...previous, [section]: undefined }));
    setBusy(section);
    startTransition(async () => {
      const result = await run();
      setBusy(null);
      if (!result.ok) {
        setErrors((previous) => ({ ...previous, [section]: result.error.message }));
        showToast("error", result.error.message);
        return;
      }
      showToast("success", success);
    });
  }

  function onStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { caseId, status: nextStatus };
    submit("status", changeSupportStatusSchema.safeParse(input), () => changeSupportStatusAction(input), "Status updated.");
  }

  function onAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { caseId, assigneeId: nextAssignee === UNASSIGNED ? null : nextAssignee };
    submit(
      "assignee",
      assignSupportCaseSchema.safeParse(input),
      () => assignSupportCaseAction(input),
      input.assigneeId ? "Case assigned." : "Case unassigned.",
    );
  }

  function onNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { caseId, body: note };
    submit("note", supportNoteSchema.safeParse(input), () => addSupportNoteAction(input), "Note added.");
  }

  function onReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { caseId, body: reply };
    submit("reply", supportReplySchema.safeParse(input), () => replySupportCaseAction(input), "Reply sent.");
  }

  const members = team?.kind === "ok" ? team.members : [];
  const assigneeOptions =
    assignee && !members.some((member) => member.id === assignee.id) ? [assignee, ...members] : members;
  const teamNote =
    team?.kind === "hidden"
      ? `${team.reason} Only unassigning is possible.`
      : team?.kind === "error"
        ? `The team list did not load: ${team.message}`
        : team?.kind === "ok" && team.capped
          ? "Team members come from the 200 most recent accounts; older admins may be missing."
          : null;

  const disabled = (section: Section) => pending && busy === section;

  return (
    <section aria-labelledby="case-actions" className="flex flex-col gap-5">
      <h2 id="case-actions" className="text-lg font-semibold">
        Actions
      </h2>

      <div className="grid gap-5 md:grid-cols-2">
        <form onSubmit={onStatus} className="flex flex-col gap-2" noValidate>
          <Label htmlFor="case-status">Status</Label>
          <div className="flex flex-wrap gap-2">
            <Select
              value={nextStatus}
              onValueChange={(value) => setNextStatus(value as SupportCaseStatus)}
              disabled={disabled("status")}
            >
              <SelectTrigger id="case-status" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {SUPPORT_STATUS_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline" disabled={disabled("status") || nextStatus === status}>
              {disabled("status") ? "Updating..." : "Update status"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Waiting for user and resolved notify the reporter in the app.
          </p>
          {errors.status ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.status}
            </p>
          ) : null}
        </form>

        {canAssign ? (
          <form onSubmit={onAssign} className="flex flex-col gap-2" noValidate>
            <Label htmlFor="case-assignee">Assignee</Label>
            <div className="flex flex-wrap gap-2">
              <Select value={nextAssignee} onValueChange={setNextAssignee} disabled={disabled("assignee")}>
                <SelectTrigger id="case-assignee" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {assigneeOptions.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name || "Unnamed"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="submit"
                variant="outline"
                disabled={disabled("assignee") || nextAssignee === (assignee?.id ?? UNASSIGNED)}
              >
                {disabled("assignee") ? "Saving..." : "Save assignee"}
              </Button>
            </div>
            {teamNote ? <p className="text-xs text-muted-foreground">{teamNote}</p> : null}
            {errors.assignee ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.assignee}
              </p>
            ) : null}
          </form>
        ) : (
          <p className="self-end text-xs text-muted-foreground">
            {missingKeyMessage("support.assign", "Assigning the case")}
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={onNote} className="flex flex-col gap-2" noValidate>
          <Label htmlFor="case-note" className="flex items-center gap-1.5">
            <Lock size={14} aria-hidden="true" />
            Internal note
          </Label>
          <Textarea
            id="case-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={SUPPORT_TEXT_MAX}
            disabled={disabled("note")}
            aria-describedby="case-note-hint"
            className="min-h-28"
          />
          <p id="case-note-hint" className="text-xs text-muted-foreground">
            Only the team sees notes; the reporter never does.
          </p>
          {errors.note ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.note}
            </p>
          ) : null}
          <Button type="submit" variant="outline" className="w-fit" disabled={disabled("note")}>
            {disabled("note") ? "Adding..." : "Add internal note"}
          </Button>
        </form>

        <form onSubmit={onReply} className="flex flex-col gap-2" noValidate>
          <Label htmlFor="case-reply" className="flex items-center gap-1.5">
            <Send size={14} aria-hidden="true" />
            Reply to the reporter
          </Label>
          <Textarea
            id="case-reply"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            maxLength={SUPPORT_TEXT_MAX}
            disabled={disabled("reply")}
            aria-describedby="case-reply-hint"
            className="min-h-28"
          />
          <p id="case-reply-hint" className="text-xs text-muted-foreground">
            The reporter sees this on the case in the app and gets a notification.
          </p>
          {errors.reply ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.reply}
            </p>
          ) : null}
          <Button type="submit" className="w-fit" disabled={disabled("reply")}>
            {disabled("reply") ? "Sending..." : "Reply to user"}
          </Button>
        </form>
      </div>
    </section>
  );
}

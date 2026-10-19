import { Lock, Send } from "@/components/icons";
import { formatDateTime } from "@/features/applications/format";
import type { SupportCaseEvent } from "@/lib/db/support";
import { SUPPORT_STATUS_LABELS } from "@/features/support/schemas";
import { cn } from "@/lib/utils";

function author(event: SupportCaseEvent): string {
  return event.author_name || "Someone";
}

function TimelineRow({ event }: { event: SupportCaseEvent }) {
  let text: string;
  if (event.kind === "status") {
    const from = event.old_status ? SUPPORT_STATUS_LABELS[event.old_status] : "unknown";
    const to = event.new_status ? SUPPORT_STATUS_LABELS[event.new_status] : "unknown";
    text = `${author(event)} changed the status from ${from} to ${to}.`;
  } else {
    text = event.assignee_id
      ? `${author(event)} assigned the case to ${event.assignee_name || "a team member"}.`
      : `${author(event)} unassigned the case.`;
  }
  return (
    <li data-event-kind={event.kind} className="flex items-start gap-3 py-1 pl-1 text-sm">
      <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/60" />
      <p className="flex flex-wrap gap-x-2 text-muted-foreground">
        <span>{text}</span>
        <time dateTime={event.created_at} className="text-xs">
          {formatDateTime(event.created_at)}
        </time>
      </p>
    </li>
  );
}

function MessageRow({ event }: { event: SupportCaseEvent }) {
  const note = event.kind === "note";
  const Icon = note ? Lock : Send;
  return (
    <li
      data-event-kind={event.kind}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4",
        note
          ? "border-dashed border-input bg-muted/60 text-muted-foreground"
          : "border-primary/50 bg-primary/10 text-foreground",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1 font-semibold tracking-wide uppercase",
            note ? "text-muted-foreground" : "text-primary",
          )}
        >
          <Icon size={12} aria-hidden="true" />
          {note ? "Internal note" : "Reply to user"}
        </span>
        <span className="text-muted-foreground">
          {author(event)}, <time dateTime={event.created_at}>{formatDateTime(event.created_at)}</time>
        </span>
      </div>
      <p className="text-sm whitespace-pre-wrap text-foreground">
        {event.body?.trim() || "Empty."}
      </p>
      {note ? <p className="text-xs">Only the team sees this.</p> : null}
    </li>
  );
}

/**
 * Everything that happened on the case, oldest first: internal notes (muted, dashed, never
 * shown to the reporter), replies (accent, the reporter sees them in the app), and status
 * and assignment changes as timeline rows. Gated by support.read.
 */
export function CaseThread({ events }: { events: readonly SupportCaseEvent[] }) {
  return (
    <section aria-labelledby="case-thread" className="flex flex-col gap-3">
      <h2 id="case-thread" className="text-lg font-semibold">
        Thread
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No notes, replies or changes yet. The report above is the whole case so far.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {events.map((event) =>
            event.kind === "note" || event.kind === "reply" ? (
              <MessageRow key={event.id} event={event} />
            ) : (
              <TimelineRow key={event.id} event={event} />
            ),
          )}
        </ol>
      )}
    </section>
  );
}

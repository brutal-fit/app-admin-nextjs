import Link from "next/link";
import { ArrowRight, Inbox } from "@/components/icons";
import { StaggerItem, StaggerList } from "@/components/motion/stagger-list";
import { Badge } from "@/components/ui/badge";
import { applicationStatusTone } from "@/features/applications/format";
import {
  APPLICATION_STATUS_LABELS,
  MODE_LABELS,
  applicationListHref,
} from "@/features/applications/schemas";
import type { ReviewQueueResult } from "@/features/dashboard/api";

/** The oldest applications still waiting for ops, five at most, each with an inline Open. */
export function ReviewQueue({ result }: { result: ReviewQueueResult }) {
  return (
    <section
      aria-labelledby="dashboard-review-queue"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-tile"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="dashboard-review-queue" className="text-base font-semibold">
            Review queue
          </h2>
          <p className="text-xs text-muted-foreground">Oldest submission first.</p>
        </div>
        {result.kind === "ok" && result.items.length > 0 ? (
          <Link
            href={applicationListHref("awaiting_review")}
            className="focus-ring inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-foreground"
          >
            See all
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {result.kind === "hidden" ? (
        <p className="text-sm text-muted-foreground">{result.reason}</p>
      ) : result.kind === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {result.message}
        </p>
      ) : result.items.length === 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-input p-4">
          <Inbox size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Nothing is waiting</p>
            <p className="text-sm text-muted-foreground">
              Applications that are submitted or under review appear here, oldest first. None
              are waiting right now.
            </p>
          </div>
        </div>
      ) : (
        <StaggerList>
          <ol className="flex flex-col divide-y">
            {result.items.map((item, index) => (
              <StaggerItem
                key={item.trainerId}
                index={index}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{item.fullName || "Unnamed"}</span>
                  <span className="text-xs text-muted-foreground">
                    {[
                      item.city || null,
                      item.modes.length ? item.modes.map((mode) => MODE_LABELS[mode]).join(", ") : null,
                      item.waiting ? `waiting ${item.waiting}` : "not submitted",
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={applicationStatusTone(item.status)}>
                    {APPLICATION_STATUS_LABELS[item.status]}
                  </Badge>
                  <Link
                    href={`/applications/${item.trainerId}`}
                    aria-label={`Open ${item.fullName || "this application"}`}
                    className="focus-ring inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-medium hover:bg-accent"
                  >
                    Open
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </ol>
        </StaggerList>
      )}
    </section>
  );
}

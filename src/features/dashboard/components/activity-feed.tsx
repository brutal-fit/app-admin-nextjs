import Link from "next/link";
import { Activity } from "@/components/icons";
import { StaggerItem, StaggerList } from "@/components/motion/stagger-list";
import { formatDateTime } from "@/features/applications/format";
import type { ActivityResult } from "@/features/dashboard/api";

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-input p-4">
      <Activity size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/** The latest admin actions from the audit log: who did what to which record, and when. */
export function ActivityFeed({ result }: { result: ActivityResult }) {
  return (
    <section
      aria-labelledby="dashboard-activity"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-tile"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="dashboard-activity" className="text-base font-semibold">
          Activity
        </h2>
        <p className="text-xs text-muted-foreground">Latest admin actions, newest first.</p>
      </div>

      {result.kind === "hidden" ? (
        <p className="text-sm text-muted-foreground">{result.reason}</p>
      ) : result.kind === "coming" ? (
        <Placeholder title="Coming soon" body={result.reason} />
      ) : result.kind === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {result.message}
        </p>
      ) : result.items.length === 0 ? (
        <Placeholder
          title="No activity yet"
          body="Role changes, grants and application decisions appear here as admins make them. None are recorded yet."
        />
      ) : (
        <StaggerList>
          <ol className="relative flex flex-col gap-4 border-l border-border pl-5">
            {result.items.map((item, index) => (
              <StaggerItem key={item.id} index={index} className="relative flex flex-col gap-0.5">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border-2 border-card bg-muted-foreground"
                />
                <p className="text-sm">
                  <span className="font-semibold">{item.actorName}</span> {item.verb}{" "}
                  {item.target ? (
                    item.target.href ? (
                      <Link
                        href={item.target.href}
                        className="focus-ring rounded-sm font-medium underline underline-offset-4 hover:text-primary"
                      >
                        {item.target.label}
                      </Link>
                    ) : (
                      <span className="font-medium">{item.target.label}</span>
                    )
                  ) : null}
                </p>
                <time
                  dateTime={item.at}
                  title={formatDateTime(item.at)}
                  className="text-xs text-muted-foreground"
                >
                  {item.relative}
                </time>
              </StaggerItem>
            ))}
          </ol>
        </StaggerList>
      )}
    </section>
  );
}

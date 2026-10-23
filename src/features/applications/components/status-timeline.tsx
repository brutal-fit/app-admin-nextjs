import { Check } from "@/components/icons";
import { cn } from "@/lib/utils";
import { applicationTimelineSteps, formatDateTime, timelineIndex } from "@/features/applications/format";
import type { ApplicationStatus } from "@/types/database";

type StepState = "done" | "current" | "upcoming";

/**
 * Where the application stands: draft, submitted, under review, needs information, then the
 * decision, always in that order. Timestamps show only where the table has them (created,
 * submitted, last change) and never run backwards (applicationTimelineSteps); the audit log is
 * not read here. "Needs information" is optional, so once past it the step
 * says it may have been skipped rather than claiming it happened.
 */
export function StatusTimeline({
  status,
  createdAt,
  submittedAt,
  updatedAt,
}: {
  status: ApplicationStatus;
  createdAt: string;
  submittedAt: string | null;
  updatedAt: string;
}) {
  const current = timelineIndex(status);
  const steps = applicationTimelineSteps({ status, createdAt, submittedAt, updatedAt });

  return (
    <section aria-labelledby="application-timeline" className="flex flex-col gap-3">
      <h2 id="application-timeline" className="sr-only">
        Status timeline
      </h2>
      <ol className="grid gap-3 sm:grid-cols-5">
        {steps.map((step, index) => {
          const state: StepState = index < current ? "done" : index === current ? "current" : "upcoming";
          const tone =
            state === "current" && step.key === "decision"
              ? status === "approved"
                ? "border-success text-success"
                : "border-destructive text-destructive"
              : state === "current"
                ? "border-primary text-primary"
                : state === "done"
                  ? "border-foreground/40 text-foreground"
                  : "border-border text-muted-foreground";
          return (
            <li
              key={step.key}
              aria-current={state === "current" ? "step" : undefined}
              className="relative flex gap-3 sm:flex-col sm:gap-2"
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-8 left-[0.9rem] h-[calc(100%-1.25rem)] w-px sm:top-[0.9rem] sm:left-8 sm:h-px sm:w-[calc(100%-1.25rem)]",
                    index < current ? "bg-foreground/40" : "bg-border",
                  )}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 bg-background text-xs font-bold",
                  tone,
                  state === "current" ? "shadow-[0_0_0_4px_var(--glow)]" : null,
                )}
              >
                {state === "done" ? <Check size={14} /> : index + 1}
              </span>
              <div className="flex flex-col gap-0.5 pb-1">
                <span className={cn("text-sm font-medium", state === "upcoming" ? "text-muted-foreground" : null)}>
                  {step.label}
                  <span className="sr-only">
                    {state === "done" ? " (passed)" : state === "current" ? " (current)" : " (not yet)"}
                  </span>
                </span>
                {step.at ? (
                  <span className="text-xs text-muted-foreground">
                    {step.note ? `${step.note} ` : ""}
                    {formatDateTime(step.at)}
                  </span>
                ) : step.note ? (
                  <span className="text-xs text-muted-foreground">{step.note}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

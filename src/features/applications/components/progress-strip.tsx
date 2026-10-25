import { Check } from "@/components/icons";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/features/applications/format";
import type { ProgressStep } from "@/features/applications/review-state";

const STATE_TEXT: Record<ProgressStep["state"], string> = {
  done: " (done)",
  current: " (now)",
  upcoming: " (not yet)",
};

/**
 * Where the review stands, as one compact strip: Submitted, Reviewing, Waiting for documents
 * (only when it happened) and the decision, each with the time the server has for it.
 */
export function ProgressStrip({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol aria-label="Review progress" className="flex items-start gap-1">
      {steps.map((step, index) => {
        const decidedTone =
          step.key === "decided" && step.state === "current"
            ? step.label === "Approved"
              ? "border-success text-success"
              : "border-destructive text-destructive"
            : null;
        return (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col gap-1.5"
          >
            <div className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-background",
                  decidedTone ??
                    (step.state === "current"
                      ? "border-primary text-primary shadow-[0_0_0_3px_var(--glow)]"
                      : step.state === "done"
                        ? "border-foreground/60 bg-foreground/10 text-foreground"
                        : "border-border text-muted-foreground"),
                )}
              >
                {step.state === "done" ? <Check size={12} /> : null}
              </span>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn("h-px flex-1", step.state === "done" ? "bg-foreground/40" : "bg-border")}
                />
              ) : null}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                step.state === "upcoming" ? "text-muted-foreground" : null,
              )}
            >
              {step.label}
              <span className="sr-only">{STATE_TEXT[step.state]}</span>
            </span>
            {step.at && step.state !== "upcoming" ? (
              <span className="text-[0.7rem] leading-tight text-muted-foreground">
                {formatDateTime(step.at)}
              </span>
            ) : null}
            {step.detail ? (
              <span className="text-[0.7rem] leading-tight text-warning">{step.detail}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

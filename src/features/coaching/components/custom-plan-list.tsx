import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CustomPlansState } from "@/features/coaching/api";
import { customPlanStatusTone, formatPrescription } from "@/features/coaching/format";
import { CUSTOM_PLAN_STATUS_LABELS } from "@/features/coaching/schemas";
import { formatIsoDate, formatWeeks } from "@/features/programmes/format";
import { shortId } from "@/features/payments/format";
import { permittedHref } from "@/features/support/format";
import { weekdayLabel } from "@/features/subscriptions/format";

const linkClass = "focus-ring rounded-sm font-medium underline-offset-4 hover:underline";

/**
 * A trainer's custom plans for their clients, read-only: status, weeks, start, the plan it
 * came from (a subscription or a coaching), and each day's exercises. `side` says whose page
 * this is: the trainer's lists the client of each plan, a client's lists the trainer. Gated by
 * catalogue.manage.
 */
export function CustomPlanList({
  state,
  side,
  permissions,
}: {
  state: CustomPlansState;
  side: "trainer" | "client";
  permissions: readonly string[];
}) {
  if (state.kind !== "ok") {
    return (
      <p role={state.kind === "error" ? "alert" : undefined} className="text-sm text-muted-foreground">
        {state.reason}
      </p>
    );
  }
  if (state.plans.length === 0) {
    return <p className="text-sm text-muted-foreground">No custom plans.</p>;
  }
  return (
    <ul className="flex max-w-4xl flex-col gap-4">
      {state.plans.map(({ plan, days }) => {
        const otherId = side === "trainer" ? plan.client_id : plan.trainer_id;
        const otherName =
          side === "trainer"
            ? (state.names.clients[otherId] ?? `Client ${shortId(otherId)}`)
            : (state.names.trainers[otherId] ?? `Trainer ${shortId(otherId)}`);
        const otherHref =
          side === "trainer"
            ? permittedHref(permissions, `/users/${otherId}`)
            : (permittedHref(permissions, `/trainers/${otherId}`) ?? permittedHref(permissions, `/users/${otherId}`));
        const sourceHref = plan.subscription_id
          ? permittedHref(permissions, `/subscriptions/${plan.subscription_id}`)
          : plan.coaching_id
            ? permittedHref(permissions, `/coaching/${plan.coaching_id}`)
            : null;
        return (
          <li key={plan.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-tile">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{plan.title}</span>
              <Badge variant="outline" className={customPlanStatusTone(plan.status)}>
                {CUSTOM_PLAN_STATUS_LABELS[plan.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {side === "trainer" ? "For " : "By "}
              {otherHref ? (
                <Link href={otherHref} className={linkClass}>
                  {otherName}
                </Link>
              ) : (
                otherName
              )}
              . {formatWeeks(plan.weeks)}
              {plan.starts_on ? `, from ${formatIsoDate(plan.starts_on)}` : ", not published"}.{" "}
              {sourceHref ? (
                <Link href={sourceHref} className={linkClass}>
                  {plan.subscription_id ? "From a subscription" : "From a coaching"}
                </Link>
              ) : plan.subscription_id ? (
                "From a subscription."
              ) : (
                "From a coaching."
              )}
            </p>
            {plan.notes ? <p className="text-sm">{plan.notes}</p> : null}
            {days.length === 0 ? (
              <p className="text-sm text-muted-foreground">No days yet.</p>
            ) : (
              <details>
                <summary className="focus-ring w-fit cursor-pointer rounded-sm text-sm text-muted-foreground hover:text-foreground">
                  {days.length} {days.length === 1 ? "day" : "days"}
                </summary>
                <ol className="mt-3 flex flex-col gap-3 text-sm">
                  {days.map(({ day, items }) => (
                    <li key={day.id} className="flex flex-col gap-1">
                      <span className="font-medium">
                        Week {day.week}, {weekdayLabel(day.weekday)}: {day.title}
                      </span>
                      {items.length === 0 ? (
                        <span className="text-muted-foreground">No exercises.</span>
                      ) : (
                        <ul className="flex flex-col gap-0.5 pl-4">
                          {items.map(({ item, exerciseName }) => (
                            <li key={item.id}>
                              {exerciseName ?? "Exercise"}: {formatPrescription(item)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}

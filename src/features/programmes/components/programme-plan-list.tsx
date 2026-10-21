"use client";

import Link from "next/link";
import { useTransition } from "react";
import { List } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setPlanActiveAction } from "@/features/programmes/actions";
import { ProgrammePlanSheet } from "@/features/programmes/components/programme-plan-sheet";
import { formatWeeklyPrice, formatWeeks } from "@/features/programmes/format";
import { PROGRAMME_LEVEL_LABELS, programmesHref } from "@/features/programmes/schemas";
import type { AdminProgrammePlan, OnlineTrainerOption } from "@/lib/db/programmes";
import { showToast } from "@/stores/toast-store";

/**
 * Every programme plan in the app's order, active or not: title, length, level, price,
 * popular and active state, default trainer and content counts from the server. Edit opens
 * the plan sheet, Days opens the day editor, and activate or deactivate goes through
 * admin_set_plan_active. Gated by catalogue.manage.
 */
export function ProgrammePlanList({
  plans,
  trainers,
  trainersError,
  selectedPlanId,
  nextSortOrder,
}: {
  plans: readonly AdminProgrammePlan[];
  trainers: readonly OnlineTrainerOption[];
  trainersError: string | null;
  selectedPlanId: string | null;
  nextSortOrder: number;
}) {
  const [pending, startTransition] = useTransition();

  function setActive(plan: AdminProgrammePlan, active: boolean) {
    startTransition(async () => {
      const result = await setPlanActiveAction({ id: plan.id, active });
      if (!result.ok) {
        showToast("error", result.error.message);
        return;
      }
      showToast("success", active ? `${plan.title} is active.` : `${plan.title} is inactive.`);
    });
  }

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={List}
        title="No programme plans yet"
        description="Create a plan, write its days, then activate it so clients can enrol."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-tile" aria-busy={pending}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Length</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Default trainer</TableHead>
            <TableHead>Content</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => {
            const selected = plan.id === selectedPlanId;
            return (
              <TableRow key={plan.id} data-state={selected ? "selected" : undefined}>
                <TableCell className="min-w-48 whitespace-normal">
                  <div className="flex flex-col">
                    <span className={plan.active ? "font-medium" : "font-medium text-muted-foreground"}>
                      {plan.title}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{plan.slug}</span>
                  </div>
                </TableCell>
                <TableCell>{formatWeeks(plan.weeks)}</TableCell>
                <TableCell>{PROGRAMME_LEVEL_LABELS[plan.level]}</TableCell>
                <TableCell>{formatWeeklyPrice(plan.weekly_price_inr)}</TableCell>
                <TableCell>
                  {plan.default_trainer_id ? (
                    plan.default_trainer_name || "Unnamed trainer"
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {plan.day_count === 0
                    ? "No days yet"
                    : `${plan.day_count} ${plan.day_count === 1 ? "day" : "days"}, ${plan.item_count} ${plan.item_count === 1 ? "item" : "items"}`}
                  {plan.open_enrolments > 0 ? (
                    <span className="block text-xs">{`${plan.open_enrolments} open ${plan.open_enrolments === 1 ? "enrolment" : "enrolments"}`}</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {plan.active ? (
                      <Badge variant="outline" className="border-success text-success">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                    {plan.popular ? <Badge variant="outline">Popular</Badge> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <ProgrammePlanSheet
                      // Keyed on the stored version so the sheet starts from the saved plan.
                      key={plan.updated_at}
                      mode="edit"
                      plan={plan}
                      trainers={trainers}
                      trainersError={trainersError}
                      nextSortOrder={nextSortOrder}
                    />
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        href={programmesHref({ planId: plan.id })}
                        aria-current={selected ? "true" : undefined}
                        aria-label={`Days of ${plan.title}`}
                      >
                        Days
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => setActive(plan, !plan.active)}>
                      {plan.active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/*
 * Server-side loaders for the coaching pages and the custom plans on the trainer and user
 * pages. Coaching and its months need bookings.read (the route's key); custom plans, days and
 * items need catalogue.manage and are left out without it, with a line naming the key. Plan
 * titles come from programme_plans (active plans only); a retired plan shows its short id.
 */
import {
  getCoaching,
  listCoachingPeriods,
  listCoachings,
  listCustomPlanDays,
  listCustomPlanItems,
  listCustomPlans,
  listExerciseNames,
  listPlanTitles,
} from "@/lib/db/coaching";
import { can } from "@/lib/rbac/can";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { SessionAccess } from "@/types/access";
import type {
  CoachingPeriodRow,
  CustomPlanDayRow,
  CustomPlanItemRow,
  CustomPlanRow,
  ProgrammeCoachingRow,
} from "@/types/database";
import { COACHING_PAGE_SIZE, coachingIdSchema, type CoachingFilters } from "@/features/coaching/schemas";
import { loadPartyNames, type PartyNames } from "@/features/subscriptions/api";
import { currentPeriod } from "@/features/subscriptions/format";
import { missingPermissionMessage } from "@/features/users/format";

export type CoachingListItem = {
  coaching: ProgrammeCoachingRow;
  /** The month covering today, else the next, else the last. */
  current: CoachingPeriodRow | null;
};

export type CoachingListResult =
  | { ok: true; items: CoachingListItem[]; hasNext: boolean; names: PartyNames; planTitles: Record<string, string> }
  | { ok: false; error: string };

export async function loadCoachingList(
  client: AppSupabaseClient,
  access: SessionAccess,
  filters: CoachingFilters,
  today: string,
): Promise<CoachingListResult> {
  try {
    const rows = await listCoachings(client, {
      status: filters.status,
      coachId: filters.coachId,
      limit: COACHING_PAGE_SIZE + 1,
      offset: (filters.page - 1) * COACHING_PAGE_SIZE,
    });
    const page = rows.slice(0, COACHING_PAGE_SIZE);
    const [periods, names, titles] = await Promise.all([
      listCoachingPeriods(
        client,
        page.map((row) => row.id),
      ),
      loadPartyNames(client, access, {
        clientIds: page.map((row) => row.client_id),
        trainerIds: [...page.map((row) => row.coach_id), ...(filters.coachId ? [filters.coachId] : [])],
      }),
      listPlanTitles(
        client,
        page.map((row) => row.plan_id),
      ).catch(() => new Map<string, string>()),
    ]);
    return {
      ok: true,
      items: page.map((coaching) => ({
        coaching,
        current: currentPeriod(
          periods.filter((period) => period.coaching_id === coaching.id),
          today,
        ),
      })),
      hasNext: rows.length > COACHING_PAGE_SIZE,
      names,
      planTitles: Object.fromEntries(titles),
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export type CoachingDetailResult =
  | {
      ok: true;
      coaching: ProgrammeCoachingRow;
      periods: CoachingPeriodRow[];
      names: PartyNames;
      planTitle: string | null;
    }
  | { ok: false; error: string };

export async function loadCoachingDetail(
  client: AppSupabaseClient,
  access: SessionAccess,
  id: string,
): Promise<CoachingDetailResult> {
  if (!coachingIdSchema.safeParse(id).success) return { ok: false, error: "This coaching does not exist." };
  try {
    const coaching = await getCoaching(client, id);
    const [periods, names, titles] = await Promise.all([
      listCoachingPeriods(client, [id]),
      loadPartyNames(client, access, { clientIds: [coaching.client_id], trainerIds: [coaching.coach_id] }),
      listPlanTitles(client, [coaching.plan_id]).catch(() => new Map<string, string>()),
    ]);
    return { ok: true, coaching, periods, names, planTitle: titles.get(coaching.plan_id) ?? null };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export type CustomPlanItemView = { item: CustomPlanItemRow; exerciseName: string | null };
export type CustomPlanDayView = { day: CustomPlanDayRow; items: CustomPlanItemView[] };
export type CustomPlanView = { plan: CustomPlanRow; days: CustomPlanDayView[] };

export type CustomPlansState =
  | { kind: "ok"; plans: CustomPlanView[]; names: PartyNames }
  | { kind: "hidden"; reason: string }
  | { kind: "error"; reason: string };

/**
 * Every custom plan of a trainer or of a client with its days and exercises, read-only.
 * Settles on its own: a failed read shows in its section, not over the whole page.
 */
export async function loadCustomPlans(
  client: AppSupabaseClient,
  access: SessionAccess,
  owner: { trainerId: string } | { clientId: string },
): Promise<CustomPlansState> {
  if (!can(access.permissions, "catalogue.manage")) {
    return { kind: "hidden", reason: missingPermissionMessage("catalogue.manage", "Custom plans") };
  }
  try {
    const plans = await listCustomPlans(client, owner);
    const days = await listCustomPlanDays(
      client,
      plans.map((plan) => plan.id),
    );
    const items = await listCustomPlanItems(
      client,
      days.map((day) => day.id),
    );
    const [exercises, names] = await Promise.all([
      listExerciseNames(
        client,
        items.map((item) => item.exercise_id),
      ).catch(() => new Map<string, string>()),
      loadPartyNames(client, access, {
        clientIds: plans.map((plan) => plan.client_id),
        trainerIds: plans.map((plan) => plan.trainer_id),
      }),
    ]);
    return {
      kind: "ok",
      names,
      plans: plans.map((plan) => ({
        plan,
        days: days
          .filter((day) => day.plan_id === plan.id)
          .map((day) => ({
            day,
            items: items
              .filter((item) => item.day_id === day.id)
              .sort((a, b) => a.seq - b.seq)
              .map((item) => ({ item, exerciseName: exercises.get(item.exercise_id) ?? null })),
          })),
      })),
    };
  } catch (error) {
    return { kind: "error", reason: toAppError(error).message };
  }
}

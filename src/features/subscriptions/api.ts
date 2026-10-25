/*
 * Server-side loaders for the subscription pages. Subscriptions, slots, periods and sessions
 * need bookings.read (the route's key). Trainer names come from trainer_profiles (any admin);
 * client names need users.read and are left out without it, with one line naming the key.
 */
import { getUser } from "@/lib/db/rbac";
import {
  getSubscription,
  listSubscriptionPeriods,
  listSubscriptionSessions,
  listSubscriptionSlots,
  listSubscriptions,
  type SubscriptionSession,
} from "@/lib/db/subscriptions";
import { listTrainerProfiles } from "@/lib/db/trainers";
import { can } from "@/lib/rbac/can";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { SessionAccess } from "@/types/access";
import type { SubscriptionPeriodRow, SubscriptionRow, SubscriptionSlotRow } from "@/types/database";
import { missingPermissionMessage } from "@/features/users/format";
import { currentPeriod } from "@/features/subscriptions/format";
import {
  SUBSCRIPTION_PAGE_SIZE,
  subscriptionIdSchema,
  type SubscriptionFilters,
} from "@/features/subscriptions/schemas";

/** Names of the people on a page; a missing name shows as a short reference. */
export type PartyNames = {
  clients: Record<string, string>;
  trainers: Record<string, string>;
  /** Why client names are missing (no users.read), or null. */
  clientNote: string | null;
};

/**
 * Trainer and client names for the given ids, best effort: a failed lookup leaves the name
 * out rather than failing the page.
 */
export async function loadPartyNames(
  client: AppSupabaseClient,
  access: SessionAccess,
  ids: { clientIds: readonly string[]; trainerIds: readonly string[] },
): Promise<PartyNames> {
  const trainers: Record<string, string> = {};
  const clients: Record<string, string> = {};
  const trainerIds = [...new Set(ids.trainerIds)];
  const clientIds = [...new Set(ids.clientIds)];
  const profiles = await listTrainerProfiles(client, trainerIds).catch(() => []);
  for (const profile of profiles) if (profile.display_name) trainers[profile.trainer_id] = profile.display_name;
  if (!can(access.permissions, "users.read")) {
    return {
      clients,
      trainers,
      clientNote: clientIds.length > 0 ? missingPermissionMessage("users.read", "Client names") : null,
    };
  }
  const users = await Promise.all(clientIds.map((id) => getUser(client, id).catch(() => null)));
  for (const user of users) if (user) clients[user.id] = user.full_name?.trim() || "Unnamed";
  return { clients, trainers, clientNote: null };
}

export type SubscriptionListItem = {
  subscription: SubscriptionRow;
  /** The period covering today, else the next, else the last. */
  current: SubscriptionPeriodRow | null;
};

export type SubscriptionListResult =
  | { ok: true; items: SubscriptionListItem[]; hasNext: boolean; names: PartyNames }
  | { ok: false; error: string };

export async function loadSubscriptionList(
  client: AppSupabaseClient,
  access: SessionAccess,
  filters: SubscriptionFilters,
  today: string,
): Promise<SubscriptionListResult> {
  try {
    // One extra row says whether a next page exists without a count query.
    const rows = await listSubscriptions(client, {
      status: filters.status,
      trainerId: filters.trainerId,
      period: filters.period,
      limit: SUBSCRIPTION_PAGE_SIZE + 1,
      offset: (filters.page - 1) * SUBSCRIPTION_PAGE_SIZE,
    });
    const page = rows.slice(0, SUBSCRIPTION_PAGE_SIZE);
    const periods = await listSubscriptionPeriods(
      client,
      page.map((row) => row.id),
    );
    const names = await loadPartyNames(client, access, {
      clientIds: page.map((row) => row.client_id),
      trainerIds: [...page.map((row) => row.trainer_id), ...(filters.trainerId ? [filters.trainerId] : [])],
    });
    return {
      ok: true,
      items: page.map((subscription) => ({
        subscription,
        current: currentPeriod(
          periods.filter((period) => period.subscription_id === subscription.id),
          today,
        ),
      })),
      hasNext: rows.length > SUBSCRIPTION_PAGE_SIZE,
      names,
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export type SubscriptionDetailResult =
  | {
      ok: true;
      subscription: SubscriptionRow;
      slots: SubscriptionSlotRow[];
      periods: SubscriptionPeriodRow[];
      sessions: SubscriptionSession[];
      names: PartyNames;
    }
  | { ok: false; error: string };

export async function loadSubscriptionDetail(
  client: AppSupabaseClient,
  access: SessionAccess,
  id: string,
): Promise<SubscriptionDetailResult> {
  if (!subscriptionIdSchema.safeParse(id).success) return { ok: false, error: "This subscription does not exist." };
  try {
    const subscription = await getSubscription(client, id);
    const [slots, periods, sessions, names] = await Promise.all([
      listSubscriptionSlots(client, id),
      listSubscriptionPeriods(client, [id]),
      listSubscriptionSessions(client, id),
      loadPartyNames(client, access, { clientIds: [subscription.client_id], trainerIds: [subscription.trainer_id] }),
    ]);
    return { ok: true, subscription, slots, periods, sessions, names };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

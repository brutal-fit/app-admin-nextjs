/*
 * Server-side loaders for the gym manager area (gym.self plus an active manager row). Each
 * page first resolves which of the session's gyms it shows, then reads that gym with the
 * manager's own session; the gym functions and RLS check the manager row again.
 */
import {
  getManagedGym,
  listGymBookings,
  listGymRequests,
  listGymStaff,
  type ManagedGym,
  type ManagedGymSummary,
} from "@/lib/db/gyms";
import { getGymScope } from "@/lib/rbac/gym-scope";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { BookingDetailsRow, GymRequestRow, GymStaffRow } from "@/types/database";
import { pickGymId } from "@/features/my-gym/schemas";

export type MyGymContext =
  | { status: "none" }
  | { status: "error"; message: string }
  | { status: "ok"; gyms: ManagedGymSummary[]; current: ManagedGymSummary };

/** The gym this page shows: `?gym=` when it is one of the session's gyms, else the first. */
export async function resolveMyGym(gymParam: string | string[] | undefined): Promise<MyGymContext> {
  const scope = await getGymScope();
  if (scope.status !== "ok") return scope;
  const id = pickGymId(
    scope.gyms.map((gym) => gym.id),
    gymParam,
  );
  const current = scope.gyms.find((gym) => gym.id === id) ?? scope.gyms[0];
  if (!current) return { status: "none" };
  return { status: "ok", gyms: scope.gyms, current };
}

type Loaded<T> = ({ ok: true } & T) | { ok: false; error: string };

export async function loadMyGym(client: AppSupabaseClient, gymId: string): Promise<Loaded<{ gym: ManagedGym }>> {
  try {
    return { ok: true, gym: await getManagedGym(client, gymId) };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export type RequestsPage = {
  requests: GymRequestRow[];
  /** Confirmed sessions that have not started: the ones a manager may still reassign. */
  upcoming: BookingDetailsRow[];
  staff: GymStaffRow[];
};

export async function loadRequestsPage(
  client: AppSupabaseClient,
  gymId: string,
  nowIso: string,
): Promise<Loaded<RequestsPage>> {
  try {
    const [requests, upcoming, staff] = await Promise.all([
      listGymRequests(client, gymId),
      listGymBookings(client, { gymId, when: "upcoming", fromIso: nowIso, statuses: ["confirmed"] }),
      listGymStaff(client, gymId),
    ]);
    return { ok: true, requests, upcoming, staff };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export async function loadStaffPage(client: AppSupabaseClient, gymId: string): Promise<Loaded<{ staff: GymStaffRow[] }>> {
  try {
    return { ok: true, staff: await listGymStaff(client, gymId) };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

export async function loadBookingsPage(
  client: AppSupabaseClient,
  gymId: string,
  nowIso: string,
): Promise<Loaded<{ upcoming: BookingDetailsRow[]; past: BookingDetailsRow[] }>> {
  try {
    const [upcoming, past] = await Promise.all([
      listGymBookings(client, { gymId, when: "upcoming", fromIso: nowIso }),
      listGymBookings(client, { gymId, when: "past", fromIso: nowIso }),
    ]);
    return { ok: true, upcoming, past };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

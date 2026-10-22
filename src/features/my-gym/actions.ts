"use server";

import { refresh } from "next/cache";
import {
  allotTrainer,
  declineRequest,
  getManagedGym,
  inviteGymStaff,
  reassignTrainer,
  removeGymPhotoFiles,
  removeGymStaff,
  setGymHours,
  setGymService,
  submitGymForReview,
  updateGymProfile,
} from "@/lib/db/gyms";
import { AppError } from "@/lib/supabase/errors";
import { runAction } from "@/server/run-action";
import {
  PHOTOS_MAX,
  addGymPhotoSchema,
  allotTrainerSchema,
  declineRequestSchema,
  gymServiceFormSchema,
  inviteStaffSchema,
  removeGymPhotoSchema,
  removeStaffSchema,
  setGymHoursSchema,
  submitGymSchema,
  toProfileFields,
  updateGymProfileSchema,
} from "@/features/my-gym/schemas";
import type { ActionResult } from "@/types/action-result";

// Every action is gated by the gym.self marker here, and each gym function checks again that
// the caller is an active manager of that gym (BRPRM otherwise). After the call refresh()
// re-renders the page from the server; nothing is updated locally.

export async function updateGymProfileAction(input: unknown): Promise<ActionResult> {
  return runAction(updateGymProfileSchema, input, "gym.self", async (data, { supabase }) => {
    await updateGymProfile(supabase, data.gymId, toProfileFields(data));
    refresh();
    return undefined;
  });
}

/** Adds an uploaded photo (already in the gym's folder) to the end of the gym's photos. */
export async function addGymPhotoAction(input: unknown): Promise<ActionResult> {
  return runAction(addGymPhotoSchema, input, "gym.self", async (data, { supabase }) => {
    const gym = await getManagedGym(supabase, data.gymId);
    if (gym.photos.length >= PHOTOS_MAX) {
      throw new AppError("BRVAL", `A gym can show up to ${PHOTOS_MAX} photos. Remove one first.`);
    }
    await updateGymProfile(supabase, data.gymId, { photos: [...gym.photos, data.path] });
    refresh();
    return undefined;
  });
}

/** Takes a photo off the gym, then deletes the file; a failed delete leaves only an unused file. */
export async function removeGymPhotoAction(input: unknown): Promise<ActionResult> {
  return runAction(removeGymPhotoSchema, input, "gym.self", async (data, { supabase }) => {
    const gym = await getManagedGym(supabase, data.gymId);
    if (!gym.photos.includes(data.path)) throw new AppError("BRNTF", "That photo is no longer on the gym.");
    await updateGymProfile(supabase, data.gymId, { photos: gym.photos.filter((path) => path !== data.path) });
    try {
      await removeGymPhotoFiles(supabase, [data.path]);
    } catch {
      // The gym no longer shows it; the stray file is harmless.
    }
    refresh();
    return undefined;
  });
}

/** Adds a service or changes one; a new or changed ask waits for BRUTAL's platform price. */
export async function saveGymServiceAction(input: unknown): Promise<ActionResult> {
  return runAction(gymServiceFormSchema, input, "gym.self", async (data, { supabase }) => {
    await setGymService(supabase, {
      gym_id: data.gymId,
      ...(data.serviceId ? { id: data.serviceId } : {}),
      title: data.title,
      mode: data.mode,
      duration_minutes: data.durationMinutes,
      submitted_price_inr: data.askInr,
      active: data.active,
    });
    refresh();
    return undefined;
  });
}

export async function setGymHoursAction(input: unknown): Promise<ActionResult> {
  return runAction(setGymHoursSchema, input, "gym.self", async (data, { supabase }) => {
    await setGymHours(
      supabase,
      data.gymId,
      data.windows.map((w) => ({ weekday: w.weekday, start_minute: w.startMinute, end_minute: w.endMinute })),
    );
    refresh();
    return undefined;
  });
}

export async function submitGymAction(input: unknown): Promise<ActionResult> {
  return runAction(submitGymSchema, input, "gym.self", async (data, { supabase }) => {
    await submitGymForReview(supabase, data.gymId);
    refresh();
    return undefined;
  });
}

/** Allots a trainer to a request (confirming it) or reassigns a confirmed session. */
export async function allotTrainerAction(input: unknown): Promise<ActionResult> {
  return runAction(allotTrainerSchema, input, "gym.self", async (data, { supabase }) => {
    if (data.kind === "allot") await allotTrainer(supabase, data.bookingId, data.trainerUserId);
    else await reassignTrainer(supabase, data.bookingId, data.trainerUserId);
    refresh();
    return undefined;
  });
}

export async function declineRequestAction(input: unknown): Promise<ActionResult> {
  return runAction(declineRequestSchema, input, "gym.self", async (data, { supabase }) => {
    await declineRequest(supabase, data.bookingId, data.reason);
    refresh();
    return undefined;
  });
}

export async function inviteStaffAction(input: unknown): Promise<ActionResult> {
  return runAction(inviteStaffSchema, input, "gym.self", async (data, { supabase }) => {
    await inviteGymStaff(supabase, { gymId: data.gymId, phone: data.phone, role: data.role });
    refresh();
    return undefined;
  });
}

export async function removeStaffAction(input: unknown): Promise<ActionResult> {
  return runAction(removeStaffSchema, input, "gym.self", async (data, { supabase }) => {
    await removeGymStaff(supabase, data.staffId);
    refresh();
    return undefined;
  });
}

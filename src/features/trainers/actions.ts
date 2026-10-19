"use server";

import { refresh } from "next/cache";
import { requestDocuments, setServices, updateTrainerProfile } from "@/lib/db/trainers";
import { runAction } from "@/server/run-action";
import {
  requestDocumentsSchema,
  setServicesSchema,
  setTrainerListedSchema,
  updateTrainerProfileSchema,
} from "@/features/trainers/schemas";
import type { ActionResult } from "@/types/action-result";

// Each action calls one admin function, then refresh() re-renders the trainer page so it
// reads the profile, services and documents again. Nothing is updated locally.

export async function updateTrainerProfileAction(input: unknown): Promise<ActionResult> {
  return runAction(updateTrainerProfileSchema, input, "trainers.edit", async (data, { supabase }) => {
    await updateTrainerProfile(supabase, data.trainerId, data.fields);
    refresh();
    return undefined;
  });
}

export async function setTrainerListedAction(input: unknown): Promise<ActionResult> {
  return runAction(setTrainerListedSchema, input, "trainers.edit", async (data, { supabase }) => {
    await updateTrainerProfile(supabase, data.trainerId, { published: data.published });
    refresh();
    return undefined;
  });
}

export async function setServicesAction(input: unknown): Promise<ActionResult> {
  return runAction(setServicesSchema, input, "trainers.edit", async (data, { supabase }) => {
    await setServices(supabase, data.trainerId, data.services);
    refresh();
    return undefined;
  });
}

export async function requestDocumentsAction(input: unknown): Promise<ActionResult> {
  return runAction(requestDocumentsSchema, input, "documents.review", async (data, { supabase }) => {
    await requestDocuments(supabase, data);
    refresh();
    return undefined;
  });
}

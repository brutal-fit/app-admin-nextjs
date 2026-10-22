"use server";

import { refresh } from "next/cache";
import { createGym, setGymListed, setGymServicePrice, verifyGym } from "@/lib/db/gyms-admin";
import { runAction } from "@/server/run-action";
import {
  createGymSchema,
  setGymListedSchema,
  setGymServicePriceSchema,
  verifyGymSchema,
} from "@/features/gyms/schemas";
import type { ActionResult } from "@/types/action-result";

// Each action calls one admin gym function (gyms.manage, checked again in the database),
// then refresh() re-renders the page so it reads the gym again. Nothing is updated locally.

/** Creates a draft gym with its first manager invited by phone; returns the new gym's id. */
export async function createGymAction(input: unknown): Promise<ActionResult<{ gymId: string }>> {
  return runAction(createGymSchema, input, "gyms.manage", async (data, { supabase }) => {
    const gymId = await createGym(supabase, {
      name: data.name,
      address_text: data.addressText,
      area: data.area,
      city: data.city,
      ...(data.tagline ? { tagline: data.tagline } : {}),
      manager_phone: data.managerPhone,
    });
    return { gymId };
  });
}

export async function verifyGymAction(input: unknown): Promise<ActionResult> {
  return runAction(verifyGymSchema, input, "gyms.manage", async (data, { supabase }) => {
    await verifyGym(supabase, { gymId: data.gymId, decision: data.decision, note: data.note });
    refresh();
    return undefined;
  });
}

export async function setGymListedAction(input: unknown): Promise<ActionResult> {
  return runAction(setGymListedSchema, input, "gyms.manage", async (data, { supabase }) => {
    await setGymListed(supabase, data.gymId, data.listed);
    refresh();
    return undefined;
  });
}

export async function setGymServicePriceAction(input: unknown): Promise<ActionResult> {
  return runAction(setGymServicePriceSchema, input, "gyms.manage", async (data, { supabase }) => {
    await setGymServicePrice(supabase, data.serviceId, data.priceInr);
    refresh();
    return undefined;
  });
}

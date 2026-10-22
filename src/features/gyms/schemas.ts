import { z } from "zod";
import { PRICE_MAX_INR, PRICE_MIN_INR } from "@/features/applications/schemas";
import { indianMobileDigits } from "@/features/users/schemas";
import { GYM_STATUS_VALUES } from "@/lib/db/gyms";
import type { GymStatus } from "@/types/database";

/** The most rows the list shows; admin_list_gyms stops at 200 per call. */
export const GYM_LIST_LIMIT = 200;
export const GYM_SEARCH_MAX = 200;

// The limits private.gym_patch and admin_verify_gym check.
export const GYM_NAME_MAX = 80;
export const GYM_TAGLINE_MAX = 120;
export const GYM_DESCRIPTION_MAX = 2000;
export const GYM_ADDRESS_MAX = 300;
export const GYM_AREA_MAX = 80;
export const GYM_NOTE_MAX = 1000;

export const GYM_STATUS_FILTERS = ["all", ...GYM_STATUS_VALUES] as const;
export type GymStatusFilter = (typeof GYM_STATUS_FILTERS)[number];

export type GymListFilters = { status: GymStatusFilter; q: string };

export const EMPTY_GYM_FILTERS: GymListFilters = { status: "all", q: "" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseGymFilters(params: Record<string, string | string[] | undefined>): GymListFilters {
  const status = first(params.status);
  const q = (first(params.q) ?? "").trim().slice(0, GYM_SEARCH_MAX);
  return {
    status: (GYM_STATUS_FILTERS as readonly string[]).includes(status ?? "")
      ? (status as GymStatusFilter)
      : "all",
    q,
  };
}

export function gymListHref(filters: GymListFilters, change: Partial<GymListFilters> = {}): string {
  const next = { ...filters, ...change };
  const params = new URLSearchParams();
  if (next.status !== "all") params.set("status", next.status);
  if (next.q) params.set("q", next.q);
  const query = params.toString();
  return query ? `/gyms?${query}` : "/gyms";
}

export const GYM_DECISION_LABELS = {
  verified: "Verify",
  rejected: "Send back",
  suspended: "Suspend",
} as const;
export type GymDecision = keyof typeof GYM_DECISION_LABELS;

/** The decisions admin_verify_gym accepts from each status, in display order. */
export function allowedDecisions(status: GymStatus): GymDecision[] {
  switch (status) {
    case "submitted":
      return ["verified", "rejected"];
    case "verified":
    case "listed":
      return ["suspended"];
    case "suspended":
      return ["verified"];
    default:
      return [];
  }
}

/** Sending back and suspending tell the gym why; verifying may carry a note. */
export function decisionNeedsNote(decision: GymDecision): boolean {
  return decision !== "verified";
}

const gymId = z.guid("Unknown gym.");

export const verifyGymSchema = z
  .object({
    gymId,
    decision: z.enum(["verified", "rejected", "suspended"], { error: "Pick a decision." }),
    note: z
      .string()
      .trim()
      .max(GYM_NOTE_MAX, `Keep the note under ${GYM_NOTE_MAX} characters.`)
      .transform((value) => (value === "" ? null : value)),
  })
  .superRefine((value, ctx) => {
    if (decisionNeedsNote(value.decision) && value.note === null) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message:
          value.decision === "rejected"
            ? "Tell the gym what to change."
            : "Give a reason for the suspension.",
      });
    }
  });
export type VerifyGymInput = z.input<typeof verifyGymSchema>;

export const setGymListedSchema = z.object({ gymId, listed: z.boolean() });

const priceInr = z
  .number({ error: "Prices are whole rupees." })
  .int("Prices are whole rupees.")
  .min(PRICE_MIN_INR, `Prices start at INR ${PRICE_MIN_INR}.`)
  .max(PRICE_MAX_INR, `Prices stop at INR ${PRICE_MAX_INR}.`);

/** A price of null withdraws the platform price (the service stops being bookable). */
export const setGymServicePriceSchema = z.object({
  serviceId: z.guid("Unknown service."),
  priceInr: priceInr.nullable(),
});

/** A ten-digit Indian mobile, sent as E.164 "+91XXXXXXXXXX" (private.gym_phone accepts it). */
export const indianMobileSchema = z.string().transform((value, ctx) => {
  const digits = indianMobileDigits(value);
  if (digits === null) {
    ctx.addIssue({ code: "custom", message: "Enter a 10-digit Indian mobile number." });
    return z.NEVER;
  }
  return `+91${digits}`;
});

export const createGymSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "The gym name needs 2 to 80 characters.")
    .max(GYM_NAME_MAX, "The gym name needs 2 to 80 characters."),
  tagline: z.string().trim().max(GYM_TAGLINE_MAX, `Keep the tagline under ${GYM_TAGLINE_MAX} characters.`),
  addressText: z
    .string()
    .trim()
    .min(5, "The address needs 5 to 300 characters.")
    .max(GYM_ADDRESS_MAX, "The address needs 5 to 300 characters."),
  area: z.string().trim().min(1, "Name the area.").max(GYM_AREA_MAX, "Name the area in up to 80 characters."),
  city: z.string().trim().min(1, "Name the city.").max(GYM_AREA_MAX, "Name the city in up to 80 characters."),
  managerPhone: indianMobileSchema,
});
export type CreateGymInput = z.input<typeof createGymSchema>;

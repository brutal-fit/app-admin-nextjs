import { z } from "zod";
import { PRICE_MAX_INR, PRICE_MIN_INR } from "@/features/applications/schemas";
import {
  GYM_ADDRESS_MAX,
  GYM_AREA_MAX,
  GYM_DESCRIPTION_MAX,
  GYM_NAME_MAX,
  GYM_TAGLINE_MAX,
  indianMobileSchema,
} from "@/features/gyms/schemas";
import { hoursProblem } from "@/features/my-gym/format";
import { indianMobileDigits } from "@/features/users/schemas";
import type { GymProfileFields } from "@/lib/db/gyms-manager";

// The limits the gym functions check (20261022035524_gyms.sql).
export const FACILITIES_MAX = 30;
export const FACILITY_LENGTH_MAX = 40;
export const PHOTOS_MAX = 12;
export const PHOTO_BYTES_MAX = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const SERVICE_TITLE_MAX = 80;
export const DURATION_MIN = 15;
export const DURATION_MAX = 240;
export const HOURS_WINDOWS_MAX = 50;
export const DECLINE_REASON_MAX = 300;

const gymId = z.guid("Unknown gym.");

/** Reads `?gym=` into one of the gyms the session manages, else the first one. */
export function pickGymId(gymIds: readonly string[], param: string | string[] | undefined): string | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (raw && gymIds.includes(raw)) return raw;
  return gymIds[0] ?? null;
}

/** A my-gym href that keeps the chosen gym when the manager runs more than one. */
export function myGymHref(path: string, gymId: string, gymCount: number): string {
  return gymCount > 1 ? `${path}?gym=${encodeURIComponent(gymId)}` : path;
}

function parseCoordinate(value: string, min: number, max: number, ctx: z.RefinementCtx): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number) || number < min || number > max) {
    ctx.addIssue({ code: "custom", message: "That location is not valid." });
    return null;
  }
  return number;
}

export const updateGymProfileSchema = z
  .object({
    gymId,
    name: z
      .string()
      .trim()
      .min(2, "The gym name needs 2 to 80 characters.")
      .max(GYM_NAME_MAX, "The gym name needs 2 to 80 characters."),
    tagline: z.string().trim().max(GYM_TAGLINE_MAX, `Keep the tagline under ${GYM_TAGLINE_MAX} characters.`),
    description: z
      .string()
      .trim()
      .max(GYM_DESCRIPTION_MAX, `Keep the description under ${GYM_DESCRIPTION_MAX} characters.`),
    addressText: z
      .string()
      .trim()
      .min(5, "The address needs 5 to 300 characters.")
      .max(GYM_ADDRESS_MAX, "The address needs 5 to 300 characters."),
    area: z.string().trim().min(1, "Name the area.").max(GYM_AREA_MAX, "Name the area in up to 80 characters."),
    city: z.string().trim().min(1, "Name the city.").max(GYM_AREA_MAX, "Name the city in up to 80 characters."),
    lat: z.string().transform((value, ctx) => parseCoordinate(value, -90, 90, ctx)),
    lng: z.string().transform((value, ctx) => parseCoordinate(value, -180, 180, ctx)),
    facilities: z.string().transform((value, ctx) => {
      const items = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
      if (items.length > FACILITIES_MAX || items.some((item) => item.length > FACILITY_LENGTH_MAX)) {
        ctx.addIssue({
          code: "custom",
          message: `List up to ${FACILITIES_MAX} facilities of up to ${FACILITY_LENGTH_MAX} characters each.`,
        });
        return z.NEVER;
      }
      return items;
    }),
    phone: z.string().transform((value, ctx) => {
      if (value.trim() === "") return null;
      const digits = indianMobileDigits(value);
      if (digits !== null) return `+91${digits}`;
      // A landline or another country's number is kept in E.164, as private.gym_phone does.
      const compact = value.replace(/[\s()-]/g, "");
      if (/^\+[1-9][0-9]{7,14}$/.test(compact)) return compact;
      ctx.addIssue({
        code: "custom",
        message: "Enter a 10-digit mobile number, a full number starting with +, or leave it empty.",
      });
      return z.NEVER;
    }),
  })
  .superRefine((value, ctx) => {
    if ((value.lat === null) !== (value.lng === null)) {
      ctx.addIssue({ code: "custom", message: "Enter both latitude and longitude, or neither." });
    }
  });
export type UpdateGymProfileInput = z.input<typeof updateGymProfileSchema>;

/** The parsed form as gym_update_profile fields (photos are changed on their own). */
export function toProfileFields(data: z.output<typeof updateGymProfileSchema>): GymProfileFields {
  return {
    name: data.name,
    tagline: data.tagline,
    description: data.description,
    address_text: data.addressText,
    area: data.area,
    city: data.city,
    lat: data.lat,
    lng: data.lng,
    facilities: data.facilities,
    phone: data.phone,
  };
}

const photoPath = z.string().min(38).max(300);

export const addGymPhotoSchema = z
  .object({ gymId, path: photoPath })
  .refine((value) => value.path.startsWith(`${value.gymId}/`) && !value.path.includes(".."), {
    message: "That photo is not in this gym's folder.",
  });

export const removeGymPhotoSchema = z.object({ gymId, path: photoPath });

export const gymServiceFormSchema = z.object({
  gymId,
  serviceId: z.guid("Unknown service.").nullable(),
  title: z
    .string()
    .trim()
    .min(1, "Name the service.")
    .max(SERVICE_TITLE_MAX, `Keep the title under ${SERVICE_TITLE_MAX} characters.`),
  mode: z.enum(["home", "online"], { error: "Pick at the gym or online." }),
  durationMinutes: z
    .number({ error: "Sessions run 15 to 240 minutes." })
    .int("Sessions run 15 to 240 minutes.")
    .min(DURATION_MIN, "Sessions run 15 to 240 minutes.")
    .max(DURATION_MAX, "Sessions run 15 to 240 minutes."),
  askInr: z
    .number({ error: "Prices are whole rupees." })
    .int("Prices are whole rupees.")
    .min(PRICE_MIN_INR, `Prices start at INR ${PRICE_MIN_INR}.`)
    .max(PRICE_MAX_INR, `Prices stop at INR ${PRICE_MAX_INR}.`),
  active: z.boolean(),
});
export type GymServiceFormInput = z.input<typeof gymServiceFormSchema>;

const minute = z.number().int().min(0).max(1440);

export const setGymHoursSchema = z
  .object({
    gymId,
    windows: z
      .array(z.object({ weekday: z.number().int().min(1).max(7), startMinute: minute, endMinute: minute }))
      .max(HOURS_WINDOWS_MAX, `Keep it to ${HOURS_WINDOWS_MAX} opening windows.`),
  })
  .superRefine((value, ctx) => {
    const problem = hoursProblem(value.windows);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

export const submitGymSchema = z.object({ gymId });

const bookingId = z.guid("Unknown booking.");

export const allotTrainerSchema = z.object({
  bookingId,
  trainerUserId: z.guid("Pick a trainer from your staff."),
  /** allot answers a request; reassign changes the trainer of a confirmed session. */
  kind: z.enum(["allot", "reassign"]),
});

/** accept true moves the session to the asked time; false keeps the original. */
export const respondToRescheduleSchema = z.object({
  bookingId,
  accept: z.boolean({ error: "Choose accept or keep the original time." }),
});

export const declineRequestSchema = z.object({
  bookingId,
  reason: z
    .string()
    .trim()
    .min(1, "Tell the client why the gym cannot take this request.")
    .max(DECLINE_REASON_MAX, `Keep the reason under ${DECLINE_REASON_MAX} characters.`),
});

export const inviteStaffSchema = z.object({
  gymId,
  phone: indianMobileSchema,
  role: z.enum(["manager", "trainer"], { error: "Pick manager or trainer." }),
});

export const removeStaffSchema = z.object({ staffId: z.guid("Unknown staff member.") });

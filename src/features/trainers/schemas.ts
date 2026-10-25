import { z } from "zod";
import type { DocumentKind, SessionMode } from "@/types/database";

/** The list reads at most this many approved trainers; the page says so when it hits it. */
export const TRAINER_LIST_LIMIT = 200;

// Field limits for the profile form. The server allows a little more (headline 120, bio
// 2000, years 99); the panel keeps the listing's own limits.
export const HEADLINE_MAX = 80;
export const BIO_MAX = 600;
export const YEARS_MAX = 60;
export const SERVICE_AREA_MAX = 120;
export const LIST_MAX_ITEMS = 12;
export const SPECIALTY_MAX = 60;
export const LANGUAGE_MAX = 40;

// Same ranges as the services table and admin_set_services.
export const SERVICE_TITLE_MAX = 60;
export const DURATION_MIN = 15;
export const DURATION_MAX = 240;
export const SERVICE_PRICE_MIN = 1;
export const SERVICE_PRICE_MAX = 100000;

export const REQUEST_MESSAGE_MAX = 1000;

export const SESSION_MODES = ["home", "online"] as const satisfies readonly SessionMode[];
export const DOCUMENT_KINDS = [
  "government_id",
  "certificate",
  "other",
] as const satisfies readonly DocumentKind[];

/** Listing filter chips; the value lives in `?listed=`. */
export const LISTED_FILTERS = ["all", "listed", "unlisted"] as const;
export type ListedFilter = (typeof LISTED_FILTERS)[number];

export const LISTED_FILTER_LABELS: Record<ListedFilter, string> = {
  all: "All approved",
  listed: "Listed",
  unlisted: "Not listed",
};

export function parseListedFilter(value: string | string[] | undefined): ListedFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return (LISTED_FILTERS as readonly string[]).includes(raw ?? "") ? (raw as ListedFilter) : "all";
}

export function trainerListHref(filter: ListedFilter): string {
  return filter === "all" ? "/trainers" : `/trainers?listed=${filter}`;
}

export const trainerIdSchema = z.guid("Unknown trainer.");

/** The active catalogue labels for a specialties or languages picker, or why it is free text. */
export type CatalogueOptions = { options: string[] } | { options: null; reason: string };

/**
 * Comma-separated text as a trimmed, de-duplicated list (first occurrence wins, case kept).
 * The pickers fall back to it when the catalogue has no items for the list.
 */
export function parseTextList(value: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const raw of value.split(",")) {
    const item = raw.trim().replace(/\s+/g, " ");
    const key = item.toLowerCase();
    if (item === "" || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

const textList = (label: string, itemMax: number) =>
  z
    .array(
      z
        .string()
        .trim()
        .min(1, `Each ${label} needs a name.`)
        .max(itemMax, `Keep each ${label} to ${itemMax} characters or fewer.`),
    )
    .min(1, `Add at least one ${label}.`)
    .max(LIST_MAX_ITEMS, `Add at most ${LIST_MAX_ITEMS} ${label === "specialty" ? "specialties" : "languages"}.`);

/** Every editable profile field; the form sends only the ones that changed. */
export const trainerProfileFieldsSchema = z
  .object({
    headline: z
      .string()
      .trim()
      .min(1, "Write a headline.")
      .max(HEADLINE_MAX, `Keep the headline to ${HEADLINE_MAX} characters or fewer.`),
    bio: z.string().trim().max(BIO_MAX, `Keep the bio to ${BIO_MAX} characters or fewer.`),
    years_experience: z
      .number({ error: "Years of experience is a whole number." })
      .int("Years of experience is a whole number.")
      .min(0, "Years of experience cannot be negative.")
      .max(YEARS_MAX, `Years of experience stops at ${YEARS_MAX}.`),
    specialties: textList("specialty", SPECIALTY_MAX),
    languages: textList("language", LANGUAGE_MAX),
    service_area: z
      .string()
      .trim()
      .min(1, "Name the area the trainer serves.")
      .max(SERVICE_AREA_MAX, `Keep the service area to ${SERVICE_AREA_MAX} characters or fewer.`),
  })
  .partial()
  .strict();

export type TrainerProfileFieldsInput = z.input<typeof trainerProfileFieldsSchema>;

export const updateTrainerProfileSchema = z.object({
  trainerId: trainerIdSchema,
  fields: trainerProfileFieldsSchema.refine((fields) => Object.keys(fields).length > 0, {
    error: "Nothing changed.",
  }),
});

export const setTrainerListedSchema = z.object({
  trainerId: trainerIdSchema,
  published: z.boolean({ error: "Choose listed or not listed." }),
});

export const setOffersCoachingSchema = z.object({
  trainerId: trainerIdSchema,
  offersCoaching: z.boolean({ error: "Choose on or off." }),
});

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .number({ error: `${label} is a whole number.` })
    .int(`${label} is a whole number.`)
    .min(min, `${label} starts at ${min}.`)
    .max(max, `${label} stops at ${max}.`);

export const serviceInputSchema = z.object({
  id: z.guid("Unknown service.").nullable(),
  title: z
    .string()
    .trim()
    .min(1, "Each service needs a title.")
    .max(SERVICE_TITLE_MAX, `Keep service titles to ${SERVICE_TITLE_MAX} characters or fewer.`),
  mode: z.enum(SESSION_MODES, { error: "Choose home or online for each service." }),
  duration_minutes: wholeNumber("Session length", DURATION_MIN, DURATION_MAX),
  price_inr: wholeNumber("Price", SERVICE_PRICE_MIN, SERVICE_PRICE_MAX),
  active: z.boolean(),
});

export type ServiceInput = z.output<typeof serviceInputSchema>;

/** The whole service list; one service per mode, as the table's unique key requires. */
export const setServicesSchema = z.object({
  trainerId: trainerIdSchema,
  services: z
    .array(serviceInputSchema)
    .max(SESSION_MODES.length, "A trainer offers one service per mode.")
    .refine((services) => new Set(services.map((service) => service.mode)).size === services.length, {
      error: "A trainer offers one service per mode.",
    }),
});

export const requestDocumentsSchema = z.object({
  trainerId: trainerIdSchema,
  message: z
    .string()
    .trim()
    .min(1, "Tell the trainer what to send.")
    .max(REQUEST_MESSAGE_MAX, `Keep the message to ${REQUEST_MESSAGE_MAX} characters or fewer.`),
  kinds: z
    .array(z.enum(DOCUMENT_KINDS, { error: "Unknown document kind." }))
    .max(DOCUMENT_KINDS.length)
    .transform((kinds) => [...new Set(kinds)]),
});

import { describe, expect, it } from "vitest";
import {
  parseListedFilter,
  parseTextList,
  requestDocumentsSchema,
  setOffersCoachingSchema,
  setServicesSchema,
  trainerListHref,
  updateTrainerProfileSchema,
} from "@/features/trainers/schemas";

const ID = "11111111-1111-4111-8111-111111111111";
const service = (over: Record<string, unknown> = {}) => ({
  id: null,
  title: "Strength",
  mode: "home",
  duration_minutes: 60,
  price_inr: 1200,
  active: true,
  ...over,
});

describe("listed filter", () => {
  it("parses and builds the URL", () => {
    expect(parseListedFilter("listed")).toBe("listed");
    expect(parseListedFilter(["unlisted"])).toBe("unlisted");
    expect(parseListedFilter("zzz")).toBe("all");
    expect(parseListedFilter(undefined)).toBe("all");
    expect(trainerListHref("all")).toBe("/trainers");
    expect(trainerListHref("listed")).toBe("/trainers?listed=listed");
  });
});

describe("parseTextList", () => {
  it("trims, collapses spaces and de-duplicates case-insensitively", () => {
    expect(parseTextList(" Yoga, yoga ,  Weight   loss,,")).toEqual(["Yoga", "Weight loss"]);
    expect(parseTextList("")).toEqual([]);
  });
});

describe("updateTrainerProfileSchema", () => {
  it("accepts a partial change", () => {
    expect(updateTrainerProfileSchema.safeParse({ trainerId: ID, fields: { headline: "Coach" } }).success).toBe(true);
  });

  it("rejects an empty change and unknown fields", () => {
    expect(updateTrainerProfileSchema.safeParse({ trainerId: ID, fields: {} }).success).toBe(false);
    expect(updateTrainerProfileSchema.safeParse({ trainerId: ID, fields: { published: true } }).success).toBe(false);
  });

  it("enforces the limits", () => {
    const parse = (fields: object) => updateTrainerProfileSchema.safeParse({ trainerId: ID, fields }).success;
    expect(parse({ headline: "a".repeat(80) })).toBe(true);
    expect(parse({ headline: "a".repeat(81) })).toBe(false);
    expect(parse({ bio: "a".repeat(601) })).toBe(false);
    expect(parse({ years_experience: 60 })).toBe(true);
    expect(parse({ years_experience: 61 })).toBe(false);
    expect(parse({ years_experience: -1 })).toBe(false);
    expect(parse({ years_experience: 2.5 })).toBe(false);
    expect(parse({ specialties: [] })).toBe(false);
    expect(parse({ languages: Array.from({ length: 13 }, (_, i) => "L" + i) })).toBe(false);
  });
});

describe("setServicesSchema", () => {
  it("accepts one service per mode", () => {
    const ok = setServicesSchema.safeParse({
      trainerId: ID,
      services: [service(), service({ mode: "online", price_inr: 800 })],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects two services for the same mode", () => {
    expect(setServicesSchema.safeParse({ trainerId: ID, services: [service(), service()] }).success).toBe(false);
  });

  it("enforces price and duration ranges", () => {
    const parse = (over: Record<string, unknown>) => setServicesSchema.safeParse({ trainerId: ID, services: [service(over)] }).success;
    expect(parse({ price_inr: 0 })).toBe(false);
    expect(parse({ price_inr: 100001 })).toBe(false);
    expect(parse({ price_inr: 100000 })).toBe(true);
    expect(parse({ duration_minutes: 10 })).toBe(false);
    expect(parse({ duration_minutes: 241 })).toBe(false);
    expect(parse({ title: " " })).toBe(false);
    expect(parse({ mode: "gym" })).toBe(false);
  });
});

describe("requestDocumentsSchema", () => {
  it("requires a message and de-duplicates kinds", () => {
    const ok = requestDocumentsSchema.safeParse({
      trainerId: ID,
      message: "Please send your certificate",
      kinds: ["certificate", "certificate", "other"],
    });
    expect(ok.success && ok.data.kinds).toEqual(["certificate", "other"]);
    expect(requestDocumentsSchema.safeParse({ trainerId: ID, message: " ", kinds: [] }).success).toBe(false);
    expect(requestDocumentsSchema.safeParse({ trainerId: ID, message: "hi", kinds: ["selfie"] }).success).toBe(false);
  });
});

describe("setOffersCoachingSchema", () => {
  it("takes a trainer id and a boolean", () => {
    const id = "d1111111-1111-4111-8111-111111111111";
    expect(setOffersCoachingSchema.safeParse({ trainerId: id, offersCoaching: true }).success).toBe(true);
    expect(setOffersCoachingSchema.safeParse({ trainerId: id, offersCoaching: "yes" }).success).toBe(false);
    expect(setOffersCoachingSchema.safeParse({ trainerId: "nope", offersCoaching: false }).success).toBe(false);
  });
});

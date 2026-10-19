import { describe, expect, it } from "vitest";
import { describeSegment } from "@/features/announcements/format";
import {
  APP_ROUTES,
  appRouteLabel,
  peopleCount,
  routesForAudience,
  sendAnnouncementSchema,
} from "@/features/announcements/schemas";

const USER = "11111111-1111-4111-8111-111111111111";
const base = { segment: { audience: "all" }, title: "Hi", body: "Hello", route: null };

describe("sendAnnouncementSchema", () => {
  it("accepts every audience shape", () => {
    for (const segment of [
      { audience: "all" },
      { audience: "clients" },
      { audience: "trainers" },
      { audience: "trainers", city: "Pune" },
      { audience: "user", user_id: USER },
    ]) {
      expect(sendAnnouncementSchema.safeParse({ ...base, segment }).success).toBe(true);
    }
  });

  it("rejects a malformed audience", () => {
    expect(sendAnnouncementSchema.safeParse({ ...base, segment: { audience: "user" } }).success).toBe(false);
    expect(sendAnnouncementSchema.safeParse({ ...base, segment: { audience: "user", user_id: "x" } }).success).toBe(false);
    expect(sendAnnouncementSchema.safeParse({ ...base, segment: { audience: "trainers", city: " " } }).success).toBe(false);
    expect(sendAnnouncementSchema.safeParse({ ...base, segment: { audience: "all", city: "Pune" } }).success).toBe(false);
  });

  it("limits title and body", () => {
    expect(sendAnnouncementSchema.safeParse({ ...base, title: " " }).success).toBe(false);
    expect(sendAnnouncementSchema.safeParse({ ...base, title: "x".repeat(121) }).success).toBe(false);
    expect(sendAnnouncementSchema.safeParse({ ...base, body: "" }).success).toBe(false);
    expect(sendAnnouncementSchema.safeParse({ ...base, body: "x".repeat(1001) }).success).toBe(false);
  });

  it("allows only known app routes or none", () => {
    expect(sendAnnouncementSchema.safeParse({ ...base, route: "/bookings" }).success).toBe(true);
    expect(sendAnnouncementSchema.safeParse({ ...base, route: "/admin" }).success).toBe(false);
  });
});

describe("routes", () => {
  it("offers role-neutral routes for everyone and role routes for the matching audience", () => {
    const all = routesForAudience("all", null).map((route) => route.path);
    expect(all).toContain("/notifications");
    expect(all).not.toContain("/bookings");
    expect(routesForAudience("clients", null).map((r) => r.path)).toContain("/bookings");
    expect(routesForAudience("clients", null).map((r) => r.path)).not.toContain("/trainer/earnings");
    expect(routesForAudience("trainers", null).map((r) => r.path)).toContain("/trainer/earnings");
    expect(routesForAudience("user", "trainer").map((r) => r.path)).toContain("/trainer/home");
    expect(routesForAudience("user", null).every((r) => r.for === "any")).toBe(true);
  });

  it("has unique paths and labels them", () => {
    expect(new Set(APP_ROUTES.map((r) => r.path)).size).toBe(APP_ROUTES.length);
    expect(appRouteLabel("/bookings")).toBe("My bookings");
    expect(appRouteLabel("/nope")).toBeNull();
    expect(appRouteLabel(null)).toBeNull();
  });
});

describe("display helpers", () => {
  it("pluralises people", () => {
    expect(peopleCount(1)).toBe("1 person");
    expect(peopleCount(1200)).toBe("1,200 people");
  });

  it("describes stored segments", () => {
    expect(describeSegment({ audience: "all" }, {})).toEqual({ label: "Everyone", userId: null });
    expect(describeSegment({ audience: "trainers", city: "Pune" }, {}).label).toBe("Trainers in Pune");
    expect(describeSegment({ audience: "trainers" }, {}).label).toBe("All trainers");
    expect(describeSegment({ audience: "user", user_id: USER }, { [USER]: "Asha" })).toEqual({
      label: "Asha",
      userId: USER,
    });
    expect(describeSegment({ audience: "user", user_id: USER }, {}).label).toBe("One person");
    expect(describeSegment({ audience: "bogus" }, {}).label).toBe("Unknown audience");
  });
});

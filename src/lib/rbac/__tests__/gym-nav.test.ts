import { describe, expect, it } from "vitest";
import { homeHref, isGymOnlySession, sessionNavItems } from "@/lib/rbac/permissions";

const hrefs = (permissions: string[], managesGym: boolean) =>
  sessionNavItems(permissions, { managesGym }).map((item) => item.href);

describe("gym manager navigation scoping", () => {
  it("shows a gym-only manager the My gym section and nothing else", () => {
    const items = sessionNavItems(["gym.self"], { managesGym: true });
    expect(items.map((item) => item.href)).toEqual([
      "/my-gym",
      "/my-gym/requests",
      "/my-gym/staff",
      "/my-gym/bookings",
    ]);
    expect(items.every((item) => item.section === "My gym")).toBe(true);
  });

  it("hides users, audit, settings and the dashboard from a gym-only manager", () => {
    const all = hrefs(["gym.self"], true);
    for (const href of ["/dashboard", "/users", "/audit", "/settings", "/gyms"]) {
      expect(all).not.toContain(href);
    }
  });

  it("hides the gym area when the marker is held but no manager row exists", () => {
    expect(hrefs(["gym.self"], false)).toEqual([]);
    expect(hrefs(["gym.self", "users.read"], false)).not.toContain("/my-gym");
  });

  it("shows /gyms only under gyms.read and keeps the dashboard for staff", () => {
    expect(hrefs(["gyms.read"], false)).toEqual(["/dashboard", "/gyms"]);
    expect(hrefs(["users.read"], false)).not.toContain("/gyms");
  });

  it("lands gym-only sessions on /my-gym and others on /dashboard", () => {
    expect(isGymOnlySession(["gym.self"])).toBe(true);
    expect(isGymOnlySession(["gym.self", "users.read"])).toBe(false);
    expect(isGymOnlySession([])).toBe(false);
    expect(homeHref(["gym.self"])).toBe("/my-gym");
    expect(homeHref(["gym.self", "gyms.read"])).toBe("/dashboard");
    expect(homeHref([])).toBe("/dashboard");
  });
});

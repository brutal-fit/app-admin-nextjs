import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  isPermissionKey,
  navItems,
  permissionsInGroup,
  routePermission,
} from "@/lib/rbac/permissions";

// Mirrors the rows seeded by the rbac migrations 20261019000200 to 20261019000700 and the
// gym keys from 20261022035524_gyms.sql.
const SEEDED: Record<string, string> = {
  "rbac.manage": "rbac",
  "users.read": "users",
  "users.manage": "users",
  "applications.read": "applications",
  "applications.review": "applications",
  "documents.review": "applications",
  "trainers.edit": "applications",
  "trainers.read": "applications",
  "users.suspend": "users",
  "privacy.process": "users",
  "support.assign": "support",
  "bookings.address": "bookings",
  "bookings.cancel": "bookings",
  "support.read": "support",
  "support.manage": "support",
  "bookings.read": "bookings",
  "reviews.moderate": "reviews",
  "audit.read": "audit",
  "audit.export": "audit",
  "metrics.read": "audit",
  "analytics.read": "audit",
  "catalogue.manage": "settings",
  "announcements.send": "settings",
  "gyms.read": "applications",
  "gyms.manage": "applications",
  "gym.self": "applications",
};

const ADMIN_DIR = join(process.cwd(), "src", "app", "(admin)");

function adminRoutes(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...adminRoutes(full));
    else if (entry === "page.tsx") {
      const route = "/" + relative(ADMIN_DIR, dir).split(sep).join("/");
      found.push(route === "/" ? "/" : route);
    }
  }
  return found;
}

describe("permission registry", () => {
  it("holds 26 keys", () => {
    expect(PERMISSIONS).toHaveLength(26);
  });

  it("holds exactly the seeded permission keys", () => {
    expect(PERMISSIONS.map((p) => p.key).sort()).toEqual(Object.keys(SEEDED).sort());
  });

  it("uses the seeded group for every permission", () => {
    for (const permission of PERMISSIONS) {
      expect(permission.group, permission.key).toBe(SEEDED[permission.key]);
    }
  });

  it("only uses declared group keys", () => {
    const groups = new Set<string>(PERMISSION_GROUPS.map((g) => g.key));
    for (const permission of PERMISSIONS) expect(groups.has(permission.group)).toBe(true);
  });

  it("has unique keys", () => {
    const keys = PERMISSIONS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("puts documents.review in the applications group", () => {
    expect(permissionsInGroup("applications").map((p) => p.key)).toContain("documents.review");
  });

  it("recognises permission keys", () => {
    expect(isPermissionKey("rbac.manage")).toBe(true);
    expect(isPermissionKey("nope.read")).toBe(false);
  });
});

describe("routePermission", () => {
  it("maps every (admin) page to a rule", () => {
    const routes = adminRoutes(ADMIN_DIR);
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(routePermission(route), route).not.toBeNull();
    }
  });

  it("gates roles and users routes by key", () => {
    expect(routePermission("/roles")).toEqual({ kind: "permission", key: "rbac.manage" });
    expect(routePermission("/roles/1f2e3d")).toEqual({ kind: "permission", key: "rbac.manage" });
    expect(routePermission("/users/")).toEqual({ kind: "permission", key: "users.read" });
    expect(routePermission("/users/abc?x=1")).toEqual({ kind: "permission", key: "users.read" });
  });

  it("leaves dashboard and forbidden open", () => {
    expect(routePermission("/dashboard")).toEqual({ kind: "open" });
    expect(routePermission("/forbidden")).toEqual({ kind: "open" });
  });

  it("returns null for unknown paths", () => {
    expect(routePermission("/nowhere")).toBeNull();
    expect(routePermission("/roles/a/b")).toBeNull();
  });
});

describe("navItems", () => {
  it("starts with the dashboard and lists gated top-level routes", () => {
    const items = navItems();
    expect(items[0]).toEqual({ href: "/dashboard", label: "Dashboard", permission: null });
    expect(items.map((i) => i.href)).toEqual([
      "/dashboard",
      "/roles",
      "/users",
      "/privacy",
      "/applications",
      "/trainers",
      "/gyms",
      "/my-gym",
      "/my-gym/requests",
      "/my-gym/staff",
      "/my-gym/bookings",
      "/support",
      "/bookings",
      "/reviews",
      "/catalogue",
      "/settings",
      "/announcements",
      "/audit",
      "/analytics",
    ]);
  });
});

describe("applications routes", () => {
  it("gates the list and detail on applications.read", () => {
    expect(routePermission("/applications")).toEqual({ kind: "permission", key: "applications.read" });
    expect(routePermission("/applications/abc")).toEqual({ kind: "permission", key: "applications.read" });
  });
});

describe("trainers, bookings and reviews routes", () => {
  it("gates each list and detail by key", () => {
    expect(routePermission("/trainers")).toEqual({ kind: "permission", key: "trainers.read" });
    expect(routePermission("/trainers/abc")).toEqual({ kind: "permission", key: "trainers.read" });
    expect(routePermission("/bookings")).toEqual({ kind: "permission", key: "bookings.read" });
    expect(routePermission("/bookings/abc")).toEqual({ kind: "permission", key: "bookings.read" });
    expect(routePermission("/reviews")).toEqual({ kind: "permission", key: "reviews.moderate" });
  });
});

describe("privacy route", () => {
  it("gates the queue on privacy.process", () => {
    expect(routePermission("/privacy")).toEqual({ kind: "permission", key: "privacy.process" });
  });
});

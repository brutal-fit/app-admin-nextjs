/*
 * The permission registry: the single list of permission keys on the client. It must match
 * the `permissions` table seeded by the backend (asserted by a test in AD-06). Every admin
 * route, nav item, action and API route is gated by one of these keys, and the database
 * enforces the same key through private.has_permission().
 */

export const PERMISSION_GROUPS = [
  { key: "rbac", name: "Roles and permissions" },
  { key: "users", name: "Users" },
  { key: "applications", name: "Trainer applications" },
  { key: "documents", name: "Documents" },
  { key: "support", name: "Support" },
  { key: "bookings", name: "Bookings" },
  { key: "reviews", name: "Reviews" },
  { key: "settings", name: "Catalogue, settings and announcements" },
  { key: "audit", name: "Audit log" },
] as const;

export type PermissionGroupKey = (typeof PERMISSION_GROUPS)[number]["key"];

type PermissionDefinition = {
  readonly key: string;
  readonly group: PermissionGroupKey;
  readonly name: string;
  /** Admin route patterns this key opens (Next.js segment syntax). */
  readonly routes: readonly string[];
  /** API route paths that require this key. */
  readonly apis: readonly string[];
  /** Components (by file name) that render only with this key. */
  readonly components: readonly string[];
};

export const PERMISSIONS = [
  {
    key: "rbac.manage",
    group: "rbac",
    name: "Manage roles and permissions",
    routes: ["/roles", "/roles/[id]"],
    apis: [],
    components: ["create-role-dialog", "role-form", "permission-grid", "delete-role-button"],
  },
  {
    key: "users.read",
    group: "users",
    name: "View users",
    routes: ["/users", "/users/[id]"],
    apis: [],
    components: ["user-search"],
  },
  {
    key: "users.manage",
    group: "users",
    name: "Manage users and roles",
    routes: [],
    apis: ["/api/users/create", "/api/users/password-reset"],
    components: ["user-roles-panel", "grant-trainer-access", "create-user-dialog", "password-reset-button"],
  },
  {
    key: "users.suspend",
    group: "users",
    name: "Suspend and reinstate accounts",
    routes: [],
    apis: [],
    components: ["account-status-control"],
  },
  {
    key: "privacy.process",
    group: "users",
    name: "Process data export and deletion requests",
    routes: ["/privacy"],
    apis: [],
    components: ["privacy-filters", "privacy-queue-table", "privacy-request-dialog"],
  },
  {
    key: "applications.read",
    group: "applications",
    name: "View trainer applications",
    routes: ["/applications", "/applications/[trainerId]"],
    apis: [],
    components: ["application-table", "application-detail"],
  },
  {
    key: "applications.review",
    group: "applications",
    name: "Approve or reject applications and set prices",
    routes: [],
    apis: [],
    components: ["decision-form"],
  },
  {
    key: "documents.review",
    group: "applications",
    name: "Review documents",
    routes: [],
    apis: [],
    components: ["document-list", "document-verdict-dialog", "request-documents-dialog"],
  },
  {
    key: "trainers.edit",
    group: "applications",
    name: "Edit trainer profiles, services and prices",
    routes: [],
    apis: [],
    components: ["trainer-profile-form", "services-editor", "listing-toggle"],
  },
  {
    key: "trainers.read",
    group: "applications",
    name: "View approved trainer profiles and services",
    routes: ["/trainers", "/trainers/[id]"],
    apis: [],
    components: ["trainer-table", "trainer-summary"],
  },
  {
    key: "support.read",
    group: "support",
    name: "View support cases",
    routes: ["/support", "/support/[id]"],
    apis: [],
    components: ["support-queue-table", "support-filters", "case-header", "case-target-card", "case-thread"],
  },
  {
    key: "support.manage",
    group: "support",
    name: "Resolve support cases",
    routes: [],
    apis: [],
    components: ["case-action-bar"],
  },
  {
    key: "support.assign",
    group: "support",
    name: "Assign support cases",
    routes: [],
    apis: [],
    components: ["case-action-bar"],
  },
  {
    key: "bookings.read",
    group: "bookings",
    name: "View bookings",
    routes: ["/bookings", "/bookings/[id]"],
    apis: [],
    components: ["booking-table", "booking-filters", "booking-detail", "booking-timeline", "booking-dispute-card"],
  },
  {
    key: "bookings.address",
    group: "bookings",
    name: "View session addresses",
    routes: [],
    apis: [],
    components: ["booking-address-card"],
  },
  {
    key: "bookings.cancel",
    group: "bookings",
    name: "Cancel bookings and resolve disputes",
    routes: [],
    apis: [],
    components: ["cancel-booking-dialog", "resolve-dispute-dialog"],
  },
  {
    key: "reviews.moderate",
    group: "reviews",
    name: "Hide or restore reviews",
    routes: ["/reviews"],
    apis: [],
    components: ["review-list", "review-filters", "moderate-review-dialog"],
  },
  {
    key: "catalogue.manage",
    group: "settings",
    name: "Manage the catalogue and platform settings",
    routes: ["/catalogue", "/settings"],
    apis: [],
    components: [
      "catalogue-list",
      "catalogue-item-dialog",
      "delete-catalogue-item-dialog",
      "setting-form",
    ],
  },
  {
    key: "announcements.send",
    group: "settings",
    name: "Send announcements",
    routes: ["/announcements"],
    apis: [],
    components: ["announcement-composer", "announcement-history"],
  },
  {
    key: "audit.read",
    group: "audit",
    name: "View the audit log",
    routes: ["/audit"],
    apis: [],
    components: ["audit-filters", "audit-table"],
  },
  {
    key: "audit.export",
    group: "audit",
    name: "Export the audit log",
    routes: [],
    apis: ["/api/audit/export"],
    components: ["audit-export-link"],
  },
  {
    key: "metrics.read",
    group: "audit",
    name: "View platform metrics",
    routes: ["/analytics"],
    apis: [],
    components: ["range-picker", "metric-tiles", "chart-card"],
  },
] as const satisfies readonly PermissionDefinition[];

export type Permission = (typeof PERMISSIONS)[number];
export type PermissionKey = Permission["key"];

const PERMISSION_KEY_SET: ReadonlySet<string> = new Set(PERMISSIONS.map((p) => p.key));

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEY_SET.has(value);
}

/** Admin routes any signed-in admin may open, whatever their permissions. */
export const OPEN_ADMIN_ROUTES = ["/dashboard", "/forbidden"] as const;

/** Nav labels for top-level routes; a route without a label is not a nav item. */
const NAV_LABELS: Readonly<Record<string, string>> = {
  "/dashboard": "Dashboard",
  "/roles": "Roles",
  "/users": "Users",
  "/privacy": "Privacy",
  "/applications": "Applications",
  "/trainers": "Trainers",
  "/support": "Support",
  "/bookings": "Bookings",
  "/reviews": "Reviews",
  "/catalogue": "Catalogue",
  "/settings": "Settings",
  "/announcements": "Announcements",
  "/audit": "Audit log",
  "/analytics": "Analytics",
};

export type RouteRule = { kind: "open" } | { kind: "permission"; key: PermissionKey };

function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split("/")
    .map((segment) =>
      /^\[[^\]]+\]$/.test(segment) ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("/");
  return new RegExp(`^${source}$`);
}

function normalise(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] ?? "";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * What an admin route needs. Accepts a real path (`/roles/1f2e...`) or a pattern
 * (`/roles/[id]`). Returns null for a path the registry does not know, which callers treat
 * as forbidden so a new page cannot ship ungated.
 */
export function routePermission(pathname: string): RouteRule | null {
  const path = normalise(pathname);
  if ((OPEN_ADMIN_ROUTES as readonly string[]).includes(path)) return { kind: "open" };
  for (const permission of PERMISSIONS) {
    for (const route of permission.routes) {
      if (patternToRegExp(route).test(path)) return { kind: "permission", key: permission.key };
    }
  }
  return null;
}

/** Permission required by an API route path, or null when the registry does not list it. */
export function apiPermission(pathname: string): PermissionKey | null {
  const path = normalise(pathname);
  for (const permission of PERMISSIONS) {
    if ((permission.apis as readonly string[]).includes(path)) return permission.key;
  }
  return null;
}

export type NavItem = { href: string; label: string; permission: PermissionKey | null };

/** Top-level nav entries in registry order; the dashboard always comes first. */
export function navItems(): NavItem[] {
  const items: NavItem[] = [{ href: "/dashboard", label: "Dashboard", permission: null }];
  for (const permission of PERMISSIONS) {
    for (const route of permission.routes) {
      const label = NAV_LABELS[route];
      if (label && !items.some((item) => item.href === route)) {
        items.push({ href: route, label, permission: permission.key });
      }
    }
  }
  return items;
}

export function permissionsInGroup(group: PermissionGroupKey): readonly Permission[] {
  return PERMISSIONS.filter((permission) => permission.group === group);
}

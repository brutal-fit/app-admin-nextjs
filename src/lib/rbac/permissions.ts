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
    apis: ["/api/users/create"],
    components: ["user-roles-panel", "grant-trainer-access", "create-user-dialog"],
  },
  {
    key: "applications.read",
    group: "applications",
    name: "View trainer applications",
    routes: [],
    apis: [],
    components: [],
  },
  {
    key: "applications.review",
    group: "applications",
    name: "Approve or reject applications and set prices",
    routes: [],
    apis: [],
    components: [],
  },
  {
    key: "documents.review",
    group: "applications",
    name: "Review documents",
    routes: [],
    apis: [],
    components: [],
  },
  {
    key: "support.read",
    group: "support",
    name: "View support cases",
    routes: [],
    apis: [],
    components: [],
  },
  {
    key: "support.manage",
    group: "support",
    name: "Resolve support cases",
    routes: [],
    apis: [],
    components: [],
  },
  {
    key: "bookings.read",
    group: "bookings",
    name: "View bookings",
    routes: [],
    apis: [],
    components: [],
  },
  {
    key: "reviews.moderate",
    group: "reviews",
    name: "Hide or restore reviews",
    routes: [],
    apis: [],
    components: [],
  },
  {
    key: "audit.read",
    group: "audit",
    name: "View the audit log",
    routes: [],
    apis: [],
    components: [],
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

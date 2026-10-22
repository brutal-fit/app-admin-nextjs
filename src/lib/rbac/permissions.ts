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
    components: ["user-search", "user-enrolments"],
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
    key: "gyms.read",
    group: "applications",
    name: "View gyms",
    routes: ["/gyms", "/gyms/[id]"],
    apis: [],
    components: ["gym-table", "gym-filters", "gym-profile-card", "gym-hours-list", "gym-staff-table", "gym-booking-list"],
  },
  {
    key: "gyms.manage",
    group: "applications",
    name: "Create, verify and list gyms; set gym service prices",
    routes: [],
    apis: [],
    components: ["create-gym-dialog", "gym-verify-dialog", "gym-listing-toggle", "gym-service-price-dialog"],
  },
  {
    // A marker: gym functions check the caller's gym_staff manager row, not this key. The
    // gym area also needs that row (src/lib/rbac/gym-scope.ts).
    key: "gym.self",
    group: "applications",
    name: "Gym manager area",
    routes: ["/my-gym", "/my-gym/requests", "/my-gym/staff", "/my-gym/bookings"],
    apis: [],
    components: [
      "gym-switcher",
      "my-gym-profile-form",
      "my-gym-photos",
      "my-gym-services-editor",
      "my-gym-hours-editor",
      "submit-gym-button",
      "request-list",
      "allot-trainer-form",
      "decline-request-dialog",
      "staff-list",
      "invite-staff-dialog",
      "remove-staff-button",
      "my-gym-booking-list",
    ],
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
    key: "payments.read",
    group: "bookings",
    name: "View payments",
    routes: ["/payments", "/payments/[id]"],
    apis: [],
    components: ["payment-table", "payment-filters", "payment-detail", "booking-payment-card"],
  },
  {
    // The refund Edge Function checks this key itself (my_access) before calling Razorpay.
    key: "payments.manage",
    group: "bookings",
    name: "Refund payments",
    routes: [],
    apis: [],
    components: ["refund-payment-dialog"],
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
      "programmes-section",
      "programme-plan-list",
      "programme-plan-sheet",
      "programme-day-list",
      "programme-day-editor",
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
  {
    key: "analytics.read",
    group: "audit",
    name: "Read app usage analytics",
    // No route of its own: the Usage tab lives on /analytics, which stays under metrics.read.
    routes: [],
    apis: [],
    components: [
      "usage-report",
      "retention-grid",
      "funnel-chart",
      "screens-table",
      "versions-table",
      "event-day-chart",
    ],
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
  "/gyms": "Gyms",
  "/support": "Support",
  "/bookings": "Bookings",
  "/payments": "Payments",
  "/reviews": "Reviews",
  "/catalogue": "Catalogue",
  "/settings": "Settings",
  "/announcements": "Announcements",
  "/audit": "Audit log",
  "/analytics": "Analytics",
  "/my-gym": "Overview",
  "/my-gym/requests": "Requests",
  "/my-gym/staff": "Staff",
  "/my-gym/bookings": "Bookings",
};

/** Nav items under these permission keys render in their own sidebar section. */
const NAV_SECTIONS: Readonly<Partial<Record<string, string>>> = {
  "gym.self": "My gym",
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

export type NavItem = {
  href: string;
  label: string;
  permission: PermissionKey | null;
  /** Sidebar section heading; absent for the main list. */
  section?: string;
};

/** Nav entries in registry order; the dashboard always comes first. */
export function navItems(): NavItem[] {
  const items: NavItem[] = [{ href: "/dashboard", label: "Dashboard", permission: null }];
  for (const permission of PERMISSIONS) {
    const section = NAV_SECTIONS[permission.key];
    for (const route of permission.routes) {
      const label = NAV_LABELS[route];
      if (label && !items.some((item) => item.href === route)) {
        items.push(
          section
            ? { href: route, label, permission: permission.key, section }
            : { href: route, label, permission: permission.key },
        );
      }
    }
  }
  return items;
}

/** The marker key of the gym manager area. */
export const GYM_AREA_PERMISSION = "gym.self" satisfies PermissionKey;

/**
 * True when the session holds the gym manager marker and nothing else: a gym manager, whose
 * panel is the gym area only (no dashboard, users, audit or settings).
 */
export function isGymOnlySession(permissions: readonly string[]): boolean {
  return permissions.length > 0 && permissions.every((key) => key === GYM_AREA_PERMISSION);
}

/** Where a session lands after sign-in and on "/". */
export function homeHref(permissions: readonly string[]): string {
  return isGymOnlySession(permissions) ? "/my-gym" : "/dashboard";
}

/**
 * The nav this session sees: items whose key it holds, the gym area only when it also manages
 * a gym (an active gym_staff manager row), and no dashboard for a gym-only session.
 */
export function sessionNavItems(
  permissions: readonly string[],
  { managesGym }: { managesGym: boolean },
): NavItem[] {
  const gymOnly = isGymOnlySession(permissions);
  return navItems().filter((item) => {
    if (item.permission === null) return !gymOnly;
    if (!permissions.includes(item.permission)) return false;
    if (item.permission === GYM_AREA_PERMISSION) return managesGym;
    return true;
  });
}

export function permissionsInGroup(group: PermissionGroupKey): readonly Permission[] {
  return PERMISSIONS.filter((permission) => permission.group === group);
}

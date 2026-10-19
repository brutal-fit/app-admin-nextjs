import { z } from "zod";
import type { UserRole } from "@/types/database";

// Same limits as admin_send_notification.
export const ANNOUNCEMENT_TITLE_MAX = 120;
export const ANNOUNCEMENT_BODY_MAX = 1000;
export const ANNOUNCEMENT_RECIPIENT_MAX = 10000;
export const ANNOUNCEMENT_CITY_MAX = 80;

/** The history table shows this many of the newest announcements. */
export const ANNOUNCEMENT_HISTORY_LIMIT = 50;

export const AUDIENCES = ["all", "clients", "trainers", "user"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  all: "Everyone",
  clients: "All clients",
  trainers: "All trainers, or trainers in one city",
  user: "One person",
};

type AppRoute = { path: string; label: string; for: UserRole | "any" };

/**
 * Screens a notification can open, from the app's AppRoutes (signed-in screens without an id
 * in the path). An announcement either opens one of these or just sits in the inbox.
 */
export const APP_ROUTES: readonly AppRoute[] = [
  { path: "/notifications", label: "Inbox", for: "any" },
  { path: "/settings", label: "Settings", for: "any" },
  { path: "/support", label: "Help and support", for: "any" },
  { path: "/home", label: "Client home", for: "client" },
  { path: "/home/trainers", label: "Find trainers", for: "client" },
  { path: "/bookings", label: "My bookings", for: "client" },
  { path: "/messages", label: "Messages", for: "client" },
  { path: "/profile", label: "Profile", for: "client" },
  { path: "/progress", label: "Progress", for: "client" },
  { path: "/coach", label: "AI coach", for: "client" },
  { path: "/online", label: "Online training", for: "client" },
  { path: "/trainer/home", label: "Trainer home", for: "trainer" },
  { path: "/trainer/home/sessions", label: "Sessions", for: "trainer" },
  { path: "/trainer/clients", label: "Clients", for: "trainer" },
  { path: "/trainer/availability", label: "Availability", for: "trainer" },
  { path: "/trainer/earnings", label: "Earnings", for: "trainer" },
  { path: "/trainer/messages", label: "Messages", for: "trainer" },
  { path: "/trainer/profile", label: "Trainer profile", for: "trainer" },
  { path: "/trainer/application/status", label: "Application status", for: "trainer" },
];

const APP_ROUTE_PATHS: ReadonlySet<string> = new Set(APP_ROUTES.map((route) => route.path));

/** The screens that make sense for this audience; a route for the other role would not open. */
export function routesForAudience(audience: Audience, userRole: UserRole | null): AppRoute[] {
  const role: UserRole | null =
    audience === "clients" ? "client" : audience === "trainers" ? "trainer" : audience === "user" ? userRole : null;
  return APP_ROUTES.filter((route) => route.for === "any" || (role !== null && route.for === role));
}

export function appRouteLabel(path: string | null): string | null {
  if (!path) return null;
  return APP_ROUTES.find((route) => route.path === path)?.label ?? null;
}

export const segmentSchema = z.discriminatedUnion("audience", [
  z.object({ audience: z.literal("all") }).strict(),
  z.object({ audience: z.literal("clients") }).strict(),
  z
    .object({
      audience: z.literal("trainers"),
      city: z
        .string()
        .trim()
        .min(1, "Choose a city or send to every trainer.")
        .max(ANNOUNCEMENT_CITY_MAX)
        .optional(),
    })
    .strict(),
  z
    .object({ audience: z.literal("user"), user_id: z.guid("Choose the person who receives it.") })
    .strict(),
]);

export type Segment = z.output<typeof segmentSchema>;

export const sendAnnouncementSchema = z.object({
  segment: segmentSchema,
  title: z
    .string()
    .trim()
    .min(1, "Give the announcement a title.")
    .max(ANNOUNCEMENT_TITLE_MAX, `Keep the title to ${ANNOUNCEMENT_TITLE_MAX} characters or fewer.`),
  body: z
    .string()
    .trim()
    .min(1, "Write the message.")
    .max(ANNOUNCEMENT_BODY_MAX, `Keep the message to ${ANNOUNCEMENT_BODY_MAX} characters or fewer.`),
  route: z
    .string()
    .nullable()
    .refine((route) => route === null || APP_ROUTE_PATHS.has(route), {
      error: "Choose a screen from the list.",
    }),
});

export type SendAnnouncementInput = z.input<typeof sendAnnouncementSchema>;

export const estimateRecipientsSchema = z.object({ segment: segmentSchema });

/** admin_count_recipients: who the segment reaches now, by the send's own audience rule. */
export type RecipientEstimate = { count: number };

/** "1 person", "12 people". */
export function peopleCount(count: number): string {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? "person" : "people"}`;
}

import { z } from "zod";

const userId = z.guid("Unknown user.");
const roleId = z.guid("Choose a role.");

export const USER_PAGE_SIZE = 50;

/** The most rows admin_list_users returns in one call; the "joined" link loads this many. */
export const USER_MAX_PAGE = 200;

/** In-memory filters over the loaded rows, in display order. */
export const USER_FILTERS = ["joined_week", "trainers", "clients", "suspended", "admins"] as const;

export type UserFilter = (typeof USER_FILTERS)[number];

/** Reads `?joined=week` (the dashboard tile's link) into the initial filters. */
export function parseUserFilters(joined: string | string[] | undefined): UserFilter[] {
  const raw = Array.isArray(joined) ? joined[0] : joined;
  return raw === "week" ? ["joined_week"] : [];
}

export const listUsersSchema = z.object({
  query: z.string().trim().max(100, "Keep the search under 100 characters."),
  limit: z.number().int().min(1).max(100).default(USER_PAGE_SIZE),
  offset: z.number().int().min(0).default(0),
});

export const userRoleSchema = z.object({ userId, roleId });

// Only the trainer grant exists in the panel: it lets an admin also use the app as a trainer.
export const grantTrainerAccessSchema = z.object({ userId });

export const createUserSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z
    .string()
    .min(8, "Password needs at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer."),
  fullName: z.string().trim().min(1, "Enter the person's name.").max(120),
  roleIds: z.array(roleId).max(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

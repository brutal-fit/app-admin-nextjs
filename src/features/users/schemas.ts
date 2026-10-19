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

/** Reasons stop where admin_set_account_status stops (500 characters). */
export const ACCOUNT_REASON_MAX = 500;

/** Notes stop where admin_process_privacy_request stops (1000 characters). */
export const PRIVACY_NOTE_MAX = 1000;

// The function asks for a reason on every change, reinstating included.
export const setAccountStatusSchema = z.object({
  userId,
  status: z.enum(["active", "suspended"]),
  reason: z
    .string()
    .trim()
    .min(1, "Give a reason for the change.")
    .max(ACCOUNT_REASON_MAX, `Keep the reason under ${ACCOUNT_REASON_MAX} characters.`),
});

export const processPrivacyRequestSchema = z.object({
  requestId: z.guid("Unknown request."),
  outcome: z.enum(["completed", "rejected"]),
  // Optional: without a note the user gets the server's default message.
  note: z
    .string()
    .trim()
    .max(PRIVACY_NOTE_MAX, `Keep the note under ${PRIVACY_NOTE_MAX} characters.`)
    .transform((value) => (value === "" ? null : value)),
});

export const passwordResetSchema = z.object({ userId });

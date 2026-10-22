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

/** The ids a search result shows; admin_user_avatars takes at most 200. */
export const userAvatarsSchema = z.object({ ids: z.array(userId).max(200) });

/** The ids a search result shows; admin_list_user_phones takes at most 200. */
export const userPhonesSchema = z.object({ ids: z.array(userId).max(200) });

// Only the trainer grant exists in the panel: it lets an admin also use the app as a trainer.
export const grantTrainerAccessSchema = z.object({ userId });

/** An Indian mobile number: ten digits starting 6 to 9, as the app's phone field accepts. */
const INDIAN_MOBILE = /^[6-9][0-9]{9}$/;

/**
 * The ten national digits of a typed or pasted Indian mobile number ("+91 98741 63116",
 * "098741-63116", "9874163116"), or null when it is not one. Mirrors the app's
 * Formatters.mobileDigits, except that extra digits are refused instead of cut off.
 */
export function indianMobileDigits(raw: string): string | null {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+91") || (digits.length > 10 && digits.startsWith("91"))) {
    digits = digits.slice(2);
  } else if (digits.length > 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return INDIAN_MOBILE.test(digits) ? digits : null;
}

// Phone is the identity (+91 only in this version); stored as E.164 "+91XXXXXXXXXX".
export const createUserSchema = z.object({
  phone: z
    .string()
    .transform((value, ctx) => {
      const digits = indianMobileDigits(value);
      if (digits === null) {
        ctx.addIssue({ code: "custom", message: "Enter a 10-digit Indian mobile number." });
        return z.NEVER;
      }
      return `+91${digits}`;
    }),
  fullName: z.string().trim().min(1, "Enter the person's name.").max(120),
  // Optional panel login: with an email the account also gets a temporary password, shown
  // once, so the person (a gym manager, say) can sign in to this panel.
  email: z
    .string()
    .trim()
    .max(254, "That email is too long.")
    .transform((value, ctx) => {
      if (value === "") return null;
      if (!z.email().safeParse(value).success) {
        ctx.addIssue({ code: "custom", message: "Enter a valid email, or leave it empty." });
        return z.NEVER;
      }
      return value.toLowerCase();
    })
    .optional()
    .transform((value) => value ?? null),
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

import { z } from "zod";

const userId = z.guid("Unknown user.");
const roleId = z.guid("Choose a role.");

export const USER_PAGE_SIZE = 50;

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

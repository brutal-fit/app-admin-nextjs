import type { AccountStatus, UserRole } from "@/types/database";

/** What `my_access()` returns for the signed-in user, after validation. */
export type SessionAccess = {
  userId: string;
  fullName: string;
  platformRole: UserRole | null;
  accountStatus: AccountStatus;
  roles: { key: string; name: string }[];
  permissions: string[];
};

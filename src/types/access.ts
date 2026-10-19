import type { AccountStatus, UserRole } from "@/types/database";

/** What `my_access()` returns for the signed-in user, after validation. */
export type SessionAccess = {
  userId: string;
  fullName: string;
  platformRole: UserRole | null;
  accountStatus: AccountStatus;
  /** True when the user holds at least one role with `is_admin`; the server decides. */
  adminAccess: boolean;
  roles: { id: string; key: string; name: string; isAdmin: boolean }[];
  permissions: string[];
};

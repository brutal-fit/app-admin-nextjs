import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/users/actions", () => ({
  listUsersAction: vi.fn(),
  userAvatarsAction: vi.fn(),
  userPhonesAction: vi.fn(),
}));

import { UserSearch } from "@/features/users/components/user-search";
import { userPhonesSchema } from "@/features/users/schemas";
import type { AdminUserRow } from "@/types/database";

afterEach(cleanup);

const row = {
  id: "u1",
  full_name: "Asha Rao",
  email: "asha@example.com",
  platform_role: "client",
  account_status: "active",
  roles: [],
  created_at: "2026-10-01T00:00:00Z",
} as unknown as AdminUserRow;

describe("UserSearch phone", () => {
  it("names phone in the placeholder and shows the initial phones", () => {
    render(
      <UserSearch initialUsers={[row]} initialPhones={{ u1: "*********0001" }} joinedSince="2026-10-14T00:00:00Z" />,
    );
    expect(screen.getByPlaceholderText("Name, email or phone")).toBeTruthy();
    expect(screen.getByText("Phone ending in 0001")).toBeTruthy();
  });
});

describe("userPhonesSchema", () => {
  it("accepts up to 200 ids and refuses more", () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    expect(userPhonesSchema.safeParse({ ids: ids(200) }).success).toBe(true);
    expect(userPhonesSchema.safeParse({ ids: ids(201) }).success).toBe(false);
  });
});

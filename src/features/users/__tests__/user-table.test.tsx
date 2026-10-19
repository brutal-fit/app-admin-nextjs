import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UserTable } from "@/features/users/components/user-table";
import type { AdminUserRow } from "@/types/database";

afterEach(cleanup);

function user(overrides: Partial<AdminUserRow>): AdminUserRow {
  return {
    id: "u1",
    full_name: "Asha Rao",
    email: "asha@example.com",
    platform_role: "client",
    account_status: "active",
    roles: [],
    ...overrides,
  } as AdminUserRow;
}

describe("UserTable", () => {
  it("shows the empty state without users", () => {
    render(<UserTable users={[]} />);
    expect(screen.getByText("No users found")).toBeTruthy();
  });

  it("renders name link, email, status and admin roles", () => {
    render(<UserTable users={[user({ roles: ["ops"] })]} />);
    expect(screen.getByRole("link", { name: "Asha Rao" }).getAttribute("href")).toBe("/users/u1");
    expect(screen.getByText("asha@example.com")).toBeTruthy();
    expect(screen.getByText("active")).toBeTruthy();
    expect(screen.getByText("ops")).toBeTruthy();
  });

  it("falls back for missing name, email and role", () => {
    render(
      <UserTable
        users={[user({ full_name: "", email: null, platform_role: null, account_status: "suspended" })]}
      />,
    );
    expect(screen.getByText("Unnamed")).toBeTruthy();
    expect(screen.getByText("No email")).toBeTruthy();
    expect(screen.getByText("suspended")).toBeTruthy();
  });
});

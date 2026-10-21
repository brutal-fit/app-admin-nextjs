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

  it("shows a full phone formatted (users.manage)", () => {
    render(<UserTable users={[user({})]} phones={{ u1: "+919000000001" }} />);
    expect(screen.getByText("+91 90000 00001")).toBeTruthy();
    expect(screen.queryByText(/ending in/)).toBeNull();
  });

  it("shows a masked phone as the server sent it and announces the last four", () => {
    render(<UserTable users={[user({})]} phones={{ u1: "*********0001" }} />);
    expect(screen.getByText("*********0001").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("Phone ending in 0001")).toBeTruthy();
    expect(screen.queryByText("+91 90000 00001")).toBeNull();
  });

  it("tells no phone apart from a phone not loaded", () => {
    render(
      <UserTable
        users={[user({ id: "u1" }), user({ id: "u2", full_name: "Ravi Kumar" })]}
        phones={{ u1: null }}
      />,
    );
    expect(screen.getByText("No phone")).toBeTruthy();
    expect(screen.getByText("Not loaded")).toBeTruthy();
  });
});

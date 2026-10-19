import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoleTable } from "@/features/roles/components/role-table";
import type { RoleSummary } from "@/lib/db/rbac";

afterEach(cleanup);

function role(overrides: Partial<RoleSummary>): RoleSummary {
  return {
    id: "r1",
    key: "ops",
    name: "Operations",
    description: "",
    is_system: false,
    is_admin: true,
    permissionCount: 5,
    ...overrides,
  } as RoleSummary;
}

describe("RoleTable", () => {
  it("shows the empty state without roles", () => {
    render(<RoleTable roles={[]} />);
    expect(screen.getByText("No roles yet")).toBeTruthy();
  });

  it("renders a row per role with link, key, count and badges", () => {
    render(
      <RoleTable
        roles={[
          role({}),
          role({ id: "r2", key: "super_admin", name: "Super admin", is_system: true, is_admin: false, permissionCount: 11 }),
        ]}
      />,
    );
    const link = screen.getByRole("link", { name: "Operations" });
    expect(link.getAttribute("href")).toBe("/roles/r1");
    expect(screen.getByText("ops")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("Custom")).toBeTruthy();
    expect(screen.getByText("System")).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByText("No panel access")).toBeTruthy();
  });
});

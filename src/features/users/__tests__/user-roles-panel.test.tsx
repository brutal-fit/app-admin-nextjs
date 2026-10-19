import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/users/actions", () => ({
  assignRoleAction: vi.fn(),
  revokeRoleAction: vi.fn(),
}));

import { UserRolesPanel } from "@/features/users/components/user-roles-panel";

afterEach(cleanup);

const ops = { id: "r1", name: "Operations", key: "ops" };
const support = { id: "r2", name: "Support", key: "support" };

describe("UserRolesPanel", () => {
  it("shows the empty state when no role is assigned", () => {
    render(<UserRolesPanel userId="u1" assigned={[]} available={[ops]} />);
    expect(screen.getByText("No admin roles")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Assign" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("lists assigned roles with a revoke button and a system badge", () => {
    render(
      <UserRolesPanel
        userId="u1"
        assigned={[
          { roleId: "r1", key: "ops", name: "Operations", isSystem: true, grantedAt: "2026-10-19T00:00:00Z" },
        ]}
        available={[ops, support]}
      />,
    );
    expect(screen.getByText("Operations")).toBeTruthy();
    expect(screen.getByText("System")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeTruthy();
  });

  it("disables the picker when every role is assigned", () => {
    render(
      <UserRolesPanel
        userId="u1"
        assigned={[{ roleId: "r1", key: "ops", name: "Operations", isSystem: false, grantedAt: "2026-10-19T00:00:00Z" }]}
        available={[ops]}
      />,
    );
    expect(screen.getByText("Every role is assigned")).toBeTruthy();
  });
});

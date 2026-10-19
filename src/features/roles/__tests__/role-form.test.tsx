import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/roles/actions", () => ({
  createRoleAction: vi.fn(),
  updateRoleAction: vi.fn(),
}));

import { RoleForm } from "@/features/roles/components/role-form";

// Radix checkbox measures itself; jsdom has no ResizeObserver.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

afterEach(cleanup);

describe("RoleForm", () => {
  it("create mode shows the key field and a create button", () => {
    render(<RoleForm mode="create" />);
    expect(screen.getByLabelText("Key")).toBeTruthy();
    expect(screen.getByLabelText("Name")).toBeTruthy();
    expect(screen.getByLabelText("Description")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create role" })).toBeTruthy();
  });

  it("edit mode prefills values and hides the key", () => {
    render(
      <RoleForm
        mode="edit"
        role={{ id: "r1", name: "Operations", description: "Day to day", isAdmin: true }}
      />,
    );
    expect(screen.queryByLabelText("Key")).toBeNull();
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Operations");
    expect((screen.getByLabelText("Description") as HTMLInputElement).value).toBe("Day to day");
    expect(screen.getByRole("button", { name: "Save details" })).toBeTruthy();
  });

  it("locks the form and says why when disabled", () => {
    render(
      <RoleForm
        mode="edit"
        disabledReason="System roles cannot be edited."
        role={{ id: "r1", name: "Super admin", description: "", isAdmin: true }}
      />,
    );
    expect(screen.getByText("System roles cannot be edited.")).toBeTruthy();
    expect((screen.getByLabelText("Name") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Save details" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signOutAction: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/auth/actions", () => ({ signOutAction: mocks.signOutAction }));

import { Topbar } from "@/components/layout/topbar";
import { SessionStoreProvider } from "@/stores/session-store-provider";
import type { SessionAccess } from "@/types/access";

const ACCESS: SessionAccess = {
  userId: "u1",
  fullName: "Asha Rao",
  platformRole: null,
  accountStatus: "active",
  adminAccess: true,
  roles: [{ id: "r1", key: "super_admin", name: "Super admin", isAdmin: true }],
  permissions: ["users.read"],
};

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mocks.signOutAction.mockReset();
  mocks.signOutAction.mockResolvedValue(undefined);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
  cleanup();
});

function renderShell() {
  return render(
    <SessionStoreProvider access={ACCESS}>
      <Topbar items={[]} />
    </SessionStoreProvider>,
  );
}

describe("Topbar sign out", () => {
  it("shows the signed-in admin and their roles", () => {
    renderShell();
    expect(screen.getByText("Asha Rao")).toBeTruthy();
    expect(screen.getByText("Super admin")).toBeTruthy();
  });

  it("clears the session and calls the redirecting sign-out action without an update loop", async () => {
    renderShell();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    });
    await waitFor(() => expect(mocks.signOutAction).toHaveBeenCalledTimes(1));
    // Access is now null: the name falls back and no role is listed.
    expect(screen.getByText("Admin", { selector: "p" })).toBeTruthy();
    expect(screen.queryByText("Super admin")).toBeNull();
    // A fresh fallback array per selector call shows as "Maximum update depth exceeded" or
    // "getSnapshot should be cached"; neither may be logged.
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("stays stable on later renders once access is null", async () => {
    const view = renderShell();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    });
    await waitFor(() => expect(mocks.signOutAction).toHaveBeenCalled());
    view.rerender(
      <SessionStoreProvider access={ACCESS}>
        <Topbar items={[]} keepGym />
      </SessionStoreProvider>,
    );
    expect(screen.queryByText("Super admin")).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const listUsersAction = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/users/actions", () => ({ listUsersAction: (input: unknown) => listUsersAction(input) }));

import { CommandPalette } from "@/components/layout/command-palette";
import { SessionStoreProvider } from "@/stores/session-store-provider";
import { useCommandStore } from "@/stores/command-store";
import type { SessionAccess } from "@/types/access";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
Element.prototype.scrollIntoView = vi.fn();

function access(permissions: string[]): SessionAccess {
  return {
    userId: "me",
    fullName: "Ops",
    platformRole: null,
    accountStatus: "active",
    adminAccess: true,
    roles: [],
    permissions,
  };
}

function mount(permissions: string[], serviceRole = true): ReactNode {
  return (
    <SessionStoreProvider access={access(permissions)}>
      <CommandPalette serviceRoleConfigured={serviceRole} />
    </SessionStoreProvider>
  );
}

beforeEach(() => {
  push.mockReset();
  listUsersAction.mockReset();
  useCommandStore.setState({ paletteOpen: true, shortcutsOpen: false });
});

afterEach(cleanup);

describe("CommandPalette", () => {
  it("lists only permitted destinations", () => {
    render(mount(["applications.read"]));
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Applications")).toBeTruthy();
    expect(screen.queryByText("Users")).toBeNull();
    expect(screen.queryByText("Roles")).toBeNull();
    expect(screen.getByText("Applications: awaiting review")).toBeTruthy();
    expect(screen.queryByText("Users: joined in the last 7 days")).toBeNull();
    expect(screen.queryByText("New role")).toBeNull();
    expect(screen.queryByText("Invite user")).toBeNull();
    expect(screen.getByText("Keyboard shortcuts")).toBeTruthy();
  });

  it("offers management actions to those who hold the permission", () => {
    render(mount(["rbac.manage", "users.manage", "users.read"]));
    expect(screen.getByText("New role")).toBeTruthy();
    expect(screen.getByText("Invite user")).toBeTruthy();
  });

  it("explains an Invite user that cannot run", () => {
    render(mount(["users.manage"], false));
    expect(screen.getByText(/service role/i)).toBeTruthy();
  });

  it("navigates and closes on selecting a page", () => {
    render(mount(["applications.read"]));
    fireEvent.click(screen.getByText("Applications"));
    expect(push).toHaveBeenCalledWith("/applications");
    expect(useCommandStore.getState().paletteOpen).toBe(false);
  });

  it("does not search users without users.read", async () => {
    render(mount(["applications.read"]));
    fireEvent.change(screen.getByPlaceholderText("Search pages and actions..."), { target: { value: "asha" } });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(listUsersAction).not.toHaveBeenCalled();
  });

  it("searches users after the debounce and opens a result", async () => {
    listUsersAction.mockResolvedValue({
      ok: true,
      data: [{ id: "u1", full_name: "Asha Rao", email: "asha@example.com" }],
    });
    render(mount(["users.read"]));
    fireEvent.change(screen.getByPlaceholderText("Search pages, actions or users..."), { target: { value: "asha" } });
    await waitFor(() => expect(screen.getByText("Asha Rao")).toBeTruthy(), { timeout: 2000 });
    expect(listUsersAction).toHaveBeenCalledTimes(1);
    expect(listUsersAction).toHaveBeenCalledWith({ query: "asha", limit: 8, offset: 0 });
    fireEvent.click(screen.getByText("Asha Rao"));
    expect(push).toHaveBeenCalledWith("/users/u1");
  });

  it("shows the server error when the search fails", async () => {
    listUsersAction.mockResolvedValue({ ok: false, error: { message: "Search failed." } });
    render(mount(["users.read"]));
    fireEvent.change(screen.getByPlaceholderText("Search pages, actions or users..."), { target: { value: "zz" } });
    await waitFor(() => expect(screen.getByText("Search failed.")).toBeTruthy(), { timeout: 2000 });
  });

  it("hands over to the shortcut sheet", () => {
    render(mount([]));
    act(() => {
      fireEvent.click(screen.getByText("Keyboard shortcuts"));
    });
    expect(useCommandStore.getState()).toMatchObject({ shortcutsOpen: true, paletteOpen: false });
  });
});

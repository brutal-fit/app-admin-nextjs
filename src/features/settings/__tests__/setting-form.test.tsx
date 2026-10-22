import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { setSettingAction, showToast } = vi.hoisted(() => ({
  setSettingAction: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/features/settings/actions", () => ({ setSettingAction }));
vi.mock("@/stores/toast-store", () => ({ showToast }));

import type { SettingEntry } from "@/features/settings/api";
import { SettingForm } from "@/features/settings/components/setting-form";
import { SETTING_DEFINITIONS } from "@/features/settings/schemas";

// Radix select measures itself and captures the pointer; jsdom has neither.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.releasePointerCapture = vi.fn();

const COACH = SETTING_DEFINITIONS.find((definition) => definition.key === "coach.model");

function coachEntry(value: string | null): SettingEntry {
  if (!COACH) throw new Error("coach.model has no definition");
  return {
    definition: COACH,
    value,
    description: "Claude model for the AI coach.",
    updatedAt: value === null ? null : "2026-10-21T10:00:00Z",
    updatedByName: null,
  };
}

function trigger() {
  return screen.getByRole("combobox", { name: "Coach model" });
}

beforeEach(() => {
  setSettingAction.mockReset();
  showToast.mockReset();
  setSettingAction.mockResolvedValue({ ok: true, data: undefined });
});
afterEach(cleanup);

describe("SettingForm for coach.model", () => {
  it("shows the stored model and the guidance note", () => {
    render(<SettingForm entry={coachEntry("claude-haiku-5-5")} />);
    expect(trigger().textContent).toContain("Claude Haiku 5.5");
    expect(screen.getByText("Haiku for testing and development; Sonnet for launch.")).toBeTruthy();
  });

  it("submits a changed model through the settings action", async () => {
    render(<SettingForm entry={coachEntry("claude-haiku-5-5")} />);
    fireEvent.keyDown(trigger(), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "Claude Sonnet 5.5" }));
    expect(trigger().textContent).toContain("Claude Sonnet 5.5");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(setSettingAction).toHaveBeenCalledTimes(1));
    expect(setSettingAction).toHaveBeenCalledWith({ key: "coach.model", value: "claude-sonnet-5-5" });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("success", "Coach model saved."));
  });

  it("asks for a model when none is stored and does not call the server", async () => {
    render(<SettingForm entry={coachEntry(null)} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Choose one of the three models.");
    expect(setSettingAction).not.toHaveBeenCalled();
  });
});

function toggleEntry(key: "push.enabled" | "payments.enabled", value: unknown): SettingEntry {
  const definition = SETTING_DEFINITIONS.find((item) => item.key === key);
  if (!definition) throw new Error(`${key} has no definition`);
  return {
    definition,
    value: value === undefined ? null : (value as SettingEntry["value"]),
    description: definition.description,
    updatedAt: value === undefined ? null : "2026-10-22T10:00:00Z",
    updatedByName: null,
  };
}

describe.each([
  {
    key: "push.enabled" as const,
    label: "Push notifications",
    help: "Send every in-app notification to phones as well.",
  },
  {
    key: "payments.enabled" as const,
    label: "Payments",
    help: "Clients pay when requesting; off keeps requests free.",
  },
])("SettingForm for $key", ({ key, label, help }) => {
  function toggle() {
    return screen.getByRole("switch", { name: label });
  }

  it("renders a switch with its label, help and stored value", () => {
    render(<SettingForm entry={toggleEntry(key, true)} />);
    expect(screen.getByRole("heading", { name: label })).toBeTruthy();
    expect(screen.getByText(help)).toBeTruthy();
    expect(toggle().getAttribute("aria-checked")).toBe("true");
  });

  it("starts off when the setting has no row", () => {
    render(<SettingForm entry={toggleEntry(key, undefined)} />);
    expect(toggle().getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Not set yet: off until this is saved.")).toBeTruthy();
  });

  it("starts off and says so when the stored value is not a boolean", () => {
    render(<SettingForm entry={toggleEntry(key, "yes")} />);
    expect(toggle().getAttribute("aria-checked")).toBe("false");
    expect(
      screen.getByText("The stored value has a shape this form does not know; saving replaces it."),
    ).toBeTruthy();
  });

  it("toggles off and saves false through the settings action", async () => {
    render(<SettingForm entry={toggleEntry(key, true)} />);
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-checked")).toBe("false");
    expect(setSettingAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(setSettingAction).toHaveBeenCalledTimes(1));
    expect(setSettingAction).toHaveBeenCalledWith({ key, value: false });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("success", `${label} saved.`));
  });

  it("toggles on and saves true through the settings action", async () => {
    render(<SettingForm entry={toggleEntry(key, false)} />);
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(setSettingAction).toHaveBeenCalledWith({ key, value: true }));
  });

  it("shows the server's BRVAL message inline when the save is refused", async () => {
    setSettingAction.mockResolvedValue({
      ok: false,
      error: { code: "BRVAL", message: "Use true or false." },
    });
    render(<SettingForm entry={toggleEntry(key, false)} />);
    fireEvent.click(toggle());
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Use true or false.");
    expect(showToast).toHaveBeenCalledWith("error", "Use true or false.");
  });
});

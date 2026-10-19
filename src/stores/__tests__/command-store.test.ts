import { beforeEach, describe, expect, it } from "vitest";
import { useCommandStore } from "@/stores/command-store";

beforeEach(() => {
  useCommandStore.setState({ paletteOpen: false, shortcutsOpen: false });
});

describe("command store", () => {
  it("opening the palette closes the shortcut sheet", () => {
    useCommandStore.getState().setShortcutsOpen(true);
    useCommandStore.getState().setPaletteOpen(true);
    expect(useCommandStore.getState()).toMatchObject({ paletteOpen: true, shortcutsOpen: false });
  });

  it("opening the sheet closes the palette", () => {
    useCommandStore.getState().setPaletteOpen(true);
    useCommandStore.getState().setShortcutsOpen(true);
    expect(useCommandStore.getState()).toMatchObject({ paletteOpen: false, shortcutsOpen: true });
  });

  it("closing one leaves the other alone", () => {
    useCommandStore.getState().setPaletteOpen(true);
    useCommandStore.getState().setShortcutsOpen(false);
    expect(useCommandStore.getState().paletteOpen).toBe(true);
  });
});

import { create } from "zustand";

export type CommandState = {
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
};

/**
 * UI state for the command palette and the shortcut sheet, shared by the topbar trigger, the
 * global key handler and the palette. A module store is safe here (unlike the session store):
 * it holds no user data and only event handlers in the browser change it.
 */
export const useCommandStore = create<CommandState>()((set) => ({
  paletteOpen: false,
  shortcutsOpen: false,
  // Opening one closes the other, so two dialogs never stack.
  setPaletteOpen: (open) => set(open ? { paletteOpen: true, shortcutsOpen: false } : { paletteOpen: false }),
  setShortcutsOpen: (open) =>
    set(open ? { shortcutsOpen: true, paletteOpen: false } : { shortcutsOpen: false }),
}));

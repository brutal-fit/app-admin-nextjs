import { describe, expect, it } from "vitest";
import {
  GO_TO_TARGETS,
  INITIAL_SEQUENCE,
  SEQUENCE_TIMEOUT_MS,
  SHORTCUTS,
  keyLabel,
  matchShortcut,
} from "@/lib/shortcuts";

describe("shortcut registry", () => {
  it("has unique ids and a go-to entry per target", () => {
    const ids = SHORTCUTS.map((shortcut) => shortcut.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const key of Object.keys(GO_TO_TARGETS)) expect(ids).toContain(`go-${key}`);
  });

  it("is plain ASCII", () => {
    for (const shortcut of SHORTCUTS) {
      expect(/^[\x20-\x7e]+$/.test(shortcut.description)).toBe(true);
    }
  });
});

describe("matchShortcut", () => {
  it("opens the palette with Cmd or Ctrl+K, even while typing", () => {
    expect(matchShortcut({ key: "k", metaKey: true }, INITIAL_SEQUENCE, 0, false).action).toEqual({ type: "palette" });
    expect(matchShortcut({ key: "K", ctrlKey: true }, INITIAL_SEQUENCE, 0, true).action).toEqual({ type: "palette" });
  });

  it("ignores plain keys while typing", () => {
    for (const key of ["/", "?", "j", "g"]) {
      expect(matchShortcut({ key }, INITIAL_SEQUENCE, 0, true).action).toBeNull();
    }
  });

  it("maps single keys", () => {
    expect(matchShortcut({ key: "/" }, INITIAL_SEQUENCE, 0, false).action).toEqual({ type: "search" });
    expect(matchShortcut({ key: "?" }, INITIAL_SEQUENCE, 0, false).action).toEqual({ type: "help" });
    expect(matchShortcut({ key: "j" }, INITIAL_SEQUENCE, 0, false).action).toEqual({ type: "row-next" });
    expect(matchShortcut({ key: "k" }, INITIAL_SEQUENCE, 0, false).action).toEqual({ type: "row-previous" });
  });

  it("does not fire with Alt or other modifiers", () => {
    expect(matchShortcut({ key: "j", altKey: true }, INITIAL_SEQUENCE, 0, false).action).toBeNull();
    expect(matchShortcut({ key: "j", ctrlKey: true }, INITIAL_SEQUENCE, 0, false).action).toBeNull();
  });

  it("navigates on g then a target key", () => {
    const first = matchShortcut({ key: "g" }, INITIAL_SEQUENCE, 1000, false);
    expect(first.action).toBeNull();
    expect(first.state.pendingG).toBe(1000);
    const second = matchShortcut({ key: "u" }, first.state, 1500, false);
    expect(second.action).toEqual({ type: "navigate", href: "/users" });
    expect(second.state).toEqual(INITIAL_SEQUENCE);
  });

  it("drops the sequence after the timeout", () => {
    const first = matchShortcut({ key: "g" }, INITIAL_SEQUENCE, 0, false);
    const late = matchShortcut({ key: "u" }, first.state, SEQUENCE_TIMEOUT_MS + 1, false);
    expect(late.action).toBeNull();
  });

  it("resets on an unknown second key", () => {
    const first = matchShortcut({ key: "g" }, INITIAL_SEQUENCE, 0, false);
    const second = matchShortcut({ key: "z" }, first.state, 100, false);
    expect(second.action).toBeNull();
    expect(second.state).toEqual(INITIAL_SEQUENCE);
  });
});

describe("keyLabel", () => {
  it("shows Mod as Cmd on Apple and Ctrl elsewhere", () => {
    expect(keyLabel("Mod", true)).toBe("Cmd");
    expect(keyLabel("Mod", false)).toBe("Ctrl");
    expect(keyLabel("K", true)).toBe("K");
  });
});

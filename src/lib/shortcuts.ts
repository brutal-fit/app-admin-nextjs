/*
 * The keyboard shortcuts registry: what the "?" sheet lists and what the global key handler
 * understands. Pure (no DOM, no React), so the matching rules are testable on their own.
 */

export type ShortcutGroup = "General" | "Go to" | "Tables";

export type Shortcut = {
  id: string;
  group: ShortcutGroup;
  /** Keys as shown, one entry per key press in order ("g", "d"); "Mod" is Cmd or Ctrl. */
  keys: readonly string[];
  description: string;
};

/** "g" then one of these letters goes to the page; the shell drops pages the session lacks. */
export const GO_TO_TARGETS = {
  d: { href: "/dashboard", label: "Dashboard" },
  a: { href: "/applications", label: "Applications" },
  u: { href: "/users", label: "Users" },
  r: { href: "/roles", label: "Roles" },
} as const;

export type GoToKey = keyof typeof GO_TO_TARGETS;

export const SHORTCUTS: readonly Shortcut[] = [
  { id: "palette", group: "General", keys: ["Mod", "K"], description: "Open the command palette" },
  { id: "search", group: "General", keys: ["/"], description: "Focus the search box on this page" },
  { id: "help", group: "General", keys: ["?"], description: "Show keyboard shortcuts" },
  ...(Object.entries(GO_TO_TARGETS) as [GoToKey, (typeof GO_TO_TARGETS)[GoToKey]][]).map(
    ([key, target]) => ({
      id: `go-${key}`,
      group: "Go to" as const,
      keys: ["g", key],
      description: `Go to ${target.label}`,
    }),
  ),
  { id: "row-next", group: "Tables", keys: ["j"], description: "Next row" },
  { id: "row-previous", group: "Tables", keys: ["k"], description: "Previous row" },
  { id: "row-open", group: "Tables", keys: ["Enter"], description: "Open the focused row" },
];

export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = ["General", "Go to", "Tables"];

/** How long after "g" the second key still counts. */
export const SEQUENCE_TIMEOUT_MS = 1200;

export type ShortcutAction =
  | { type: "palette" }
  | { type: "search" }
  | { type: "help" }
  | { type: "navigate"; href: string }
  | { type: "row-next" }
  | { type: "row-previous" };

/** The parts of a KeyboardEvent the matcher reads, so tests can pass plain objects. */
export type KeyInput = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

export type SequenceState = { pendingG: number | null };

export const INITIAL_SEQUENCE: SequenceState = { pendingG: null };

/**
 * Matches one key press. `typing` is true when focus is in a text field: there only the
 * palette chord counts, so "/" and letters still type. Returns the action (or null) and the
 * next sequence state; `now` is a timestamp in ms.
 */
export function matchShortcut(
  input: KeyInput,
  state: SequenceState,
  now: number,
  typing: boolean,
): { action: ShortcutAction | null; state: SequenceState } {
  const key = input.key;
  const mod = Boolean(input.metaKey || input.ctrlKey);

  if (mod && !input.altKey && key.toLowerCase() === "k") {
    return { action: { type: "palette" }, state: INITIAL_SEQUENCE };
  }
  if (typing || mod || input.altKey) return { action: null, state: INITIAL_SEQUENCE };

  const pending = state.pendingG !== null && now - state.pendingG <= SEQUENCE_TIMEOUT_MS;
  if (pending) {
    const target = GO_TO_TARGETS[key.toLowerCase() as GoToKey];
    return {
      action: target ? { type: "navigate", href: target.href } : null,
      state: INITIAL_SEQUENCE,
    };
  }

  switch (key) {
    case "g":
      return { action: null, state: { pendingG: now } };
    case "/":
      return { action: { type: "search" }, state: INITIAL_SEQUENCE };
    case "?":
      return { action: { type: "help" }, state: INITIAL_SEQUENCE };
    case "j":
      return { action: { type: "row-next" }, state: INITIAL_SEQUENCE };
    case "k":
      return { action: { type: "row-previous" }, state: INITIAL_SEQUENCE };
    default:
      return { action: null, state: INITIAL_SEQUENCE };
  }
}

/** True when a key press should type rather than trigger a shortcut. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object" || !("tagName" in target)) return false;
  const element = target as HTMLElement;
  const tag = element.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (element as HTMLInputElement).type;
    return !["checkbox", "radio", "button", "submit", "reset"].includes(type);
  }
  return element.isContentEditable === true;
}

/** Display text for a key, ASCII only: "Mod" becomes Cmd on Apple platforms, else Ctrl. */
export function keyLabel(key: string, apple: boolean): string {
  if (key === "Mod") return apple ? "Cmd" : "Ctrl";
  return key;
}

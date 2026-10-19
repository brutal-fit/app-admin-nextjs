"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { INITIAL_SEQUENCE, isTypingTarget, matchShortcut, type SequenceState } from "@/lib/shortcuts";
import { useCommandStore } from "@/stores/command-store";
import { showToast } from "@/stores/toast-store";

function dialogOpen(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"]') !== null;
}

/**
 * The one window key listener: palette chord, "?", "/", "g then letter" and j/k entry into
 * the first table. "g" jumps only to pages in `allowedHrefs` (the session's nav), so a
 * shortcut never lands on the forbidden page. Renders nothing.
 */
export function GlobalShortcuts({ allowedHrefs }: { allowedHrefs: readonly string[] }) {
  const router = useRouter();

  useEffect(() => {
    let sequence: SequenceState = INITIAL_SEQUENCE;
    const { getState } = useCommandStore;

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      const { action, state } = matchShortcut(
        event,
        sequence,
        performance.now(),
        isTypingTarget(event.target),
      );
      sequence = state;
      if (!action) return;
      const store = getState();

      if (action.type === "palette") {
        event.preventDefault();
        store.setPaletteOpen(!store.paletteOpen);
        return;
      }
      // Every other shortcut waits while a dialog or sheet is open.
      if (dialogOpen()) return;

      switch (action.type) {
        case "help":
          event.preventDefault();
          store.setShortcutsOpen(true);
          break;
        case "search": {
          event.preventDefault();
          const input = document.querySelector<HTMLInputElement>("[data-shortcut-search]");
          if (input) input.focus();
          else store.setPaletteOpen(true);
          break;
        }
        case "navigate":
          event.preventDefault();
          if (allowedHrefs.includes(action.href)) router.push(action.href);
          else showToast("error", "Your roles do not include that page.");
          break;
        case "row-next":
        case "row-previous": {
          // Inside a table the table moves the focus itself.
          if ((event.target as HTMLElement | null)?.closest?.("[data-table-body]")) return;
          const first = document.querySelector<HTMLElement>("tr[data-row-nav]");
          if (first) {
            event.preventDefault();
            first.focus();
          }
          break;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, allowedHrefs]);

  return null;
}

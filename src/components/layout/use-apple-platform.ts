"use client";

import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

/** True on macOS and iOS, where the palette chord reads Cmd instead of Ctrl. */
export function useApplePlatform(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => false,
  );
}

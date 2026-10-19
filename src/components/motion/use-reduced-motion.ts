"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(QUERY).matches;
}

// The server cannot know the setting; globals.css shows final states under the media query
// before scripts run, so the server render may assume motion is allowed.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * True when the viewer asked for reduced motion. Read live from the media query (not cached
 * once per page like motion's own hook), so a change applies without a reload and a test can
 * toggle it per render.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

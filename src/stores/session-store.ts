import { createStore } from "zustand/vanilla";
import type { SessionAccess } from "@/types/access";

export type SessionState = {
  access: SessionAccess | null;
  setAccess: (access: SessionAccess) => void;
  clear: () => void;
};

export type SessionStore = ReturnType<typeof createSessionStore>;

/**
 * One store per request tree (created by SessionStoreProvider), never a module singleton:
 * a shared store would leak one admin's access into another's server render.
 */
export function createSessionStore(initialAccess: SessionAccess | null) {
  return createStore<SessionState>()((set) => ({
    access: initialAccess,
    setAccess: (access) => set({ access }),
    clear: () => set({ access: null }),
  }));
}

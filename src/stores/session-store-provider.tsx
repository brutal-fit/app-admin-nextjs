"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createSessionStore, type SessionState, type SessionStore } from "@/stores/session-store";
import type { SessionAccess } from "@/types/access";

const SessionStoreContext = createContext<SessionStore | null>(null);

export function SessionStoreProvider({
  access,
  children,
}: {
  access: SessionAccess;
  children: ReactNode;
}) {
  const [store] = useState(() => createSessionStore(access));
  return <SessionStoreContext value={store}>{children}</SessionStoreContext>;
}

export function useSessionStore<T>(selector: (state: SessionState) => T): T {
  const store = useContext(SessionStoreContext);
  if (!store) throw new Error("useSessionStore must be used inside SessionStoreProvider.");
  return useStore(store, selector);
}

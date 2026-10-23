"use client";

import { HelpCircle, Search } from "@/components/icons";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SidebarNav, type SidebarNavItem } from "@/components/layout/sidebar-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { useApplePlatform } from "@/components/layout/use-apple-platform";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useCommandStore } from "@/stores/command-store";
import { useSessionStore } from "@/stores/session-store-provider";
import type { SessionAccess } from "@/types/access";

// One shared empty list: a selector that returned a fresh [] each call would never equal its
// last result once access is cleared (sign out), and zustand would re-render without end.
const NO_ROLES: SessionAccess["roles"] = [];

/**
 * Breadcrumb, the global search trigger (opens the command palette), the shortcut sheet,
 * the signed-in admin with their roles, and sign out. On small screens it also carries the
 * nav, since the sidebar is hidden there.
 */
export function Topbar({ items, keepGym = false }: { items: SidebarNavItem[]; keepGym?: boolean }) {
  const apple = useApplePlatform();
  const setPaletteOpen = useCommandStore((state) => state.setPaletteOpen);
  const setShortcutsOpen = useCommandStore((state) => state.setShortcutsOpen);
  const fullName = useSessionStore((state) => state.access?.fullName ?? "");
  const roles = useSessionStore((state) => state.access?.roles ?? NO_ROLES);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-keyshortcuts={apple ? "Meta+K" : "Control+K"}
          className="focus-ring flex h-9 w-full items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:w-72"
        >
          <Search size={16} aria-hidden="true" />
          <span className="flex-1 text-left">Search or jump to...</span>
          <KbdGroup aria-hidden="true">
            <Kbd>{apple ? "Cmd" : "Ctrl"}</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Keyboard shortcuts"
          aria-keyshortcuts="?"
          onClick={() => setShortcutsOpen(true)}
        >
          <HelpCircle size={18} aria-hidden="true" />
        </Button>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold">{fullName || "Admin"}</p>
          <p className="text-xs text-muted-foreground">{roles.map((role) => role.name).join(", ")}</p>
        </div>
        <SignOutButton />
      </div>
      <div className="border-t border-border px-4 py-2 md:hidden">
        <SidebarNav items={items} orientation="horizontal" keepGym={keepGym} />
      </div>
    </header>
  );
}

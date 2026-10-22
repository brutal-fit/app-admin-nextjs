import type { ReactNode } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Backdrop } from "@/components/art/backdrop";
import { CommandPalette } from "@/components/layout/command-palette";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { ShortcutSheet } from "@/components/layout/shortcut-sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { can } from "@/lib/rbac/can";
import { getGymScope } from "@/lib/rbac/gym-scope";
import { homeHref, routePermission, sessionNavItems } from "@/lib/rbac/permissions";
import { getSessionAccess } from "@/lib/rbac/session";
import { PATHNAME_HEADER } from "@/lib/utils/request-headers";
import { isServiceRoleConfigured } from "@/server/service-client";
import { SessionStoreProvider } from "@/stores/session-store-provider";

/**
 * Resolves the session, applies the route's permission on full page loads, and renders the
 * sidebar, topbar, backdrop, command palette and shortcut sheet. Pages repeat the route
 * check because layouts are not re-rendered on client navigation.
 */
export async function AdminShell({ children }: { children: ReactNode }) {
  const session = await getSessionAccess();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "no-access") redirect("/login?reason=no-access");
  if (session.status === "error") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold">The admin panel cannot load</h1>
        <p role="alert" className="text-sm text-destructive">
          {session.error.message}
        </p>
        <Link href="/login" className="text-sm text-foreground underline underline-offset-4">
          Back to sign in
        </Link>
      </main>
    );
  }

  const { access } = session;
  const pathname = (await headers()).get(PATHNAME_HEADER);
  if (pathname) {
    const rule = routePermission(pathname);
    if (!rule || (rule.kind === "permission" && !can(access.permissions, rule.key))) {
      redirect("/forbidden");
    }
  }

  // The gym area shows only for a session that manages a gym right now.
  const managesGym = (await getGymScope()).status === "ok";
  const items = sessionNavItems(access.permissions, { managesGym }).map(({ href, label, section }) =>
    section ? { href, label, section } : { href, label },
  );
  const home = homeHref(access.permissions);

  return (
    <SessionStoreProvider access={access}>
      <a
        href="#main"
        className="focus-ring sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-8 border-r border-border bg-card p-4 md:flex">
          <Link
            href={home}
            className="focus-ring rounded-sm px-3 text-lg font-extrabold tracking-widest"
          >
            BRUTAL <span className="font-medium text-muted-foreground">admin</span>
          </Link>
          <SidebarNav items={items} />
          <p className="mt-auto px-3 text-xs text-muted-foreground">
            Press <kbd className="rounded-sm bg-muted px-1 font-sans">?</kbd> for shortcuts.
          </p>
        </aside>
        <div className="relative isolate flex min-w-0 flex-1 flex-col">
          <Backdrop />
          <Topbar items={items} />
          <main id="main" tabIndex={-1} className="flex-1 px-4 py-8 outline-none sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette serviceRoleConfigured={isServiceRoleConfigured()} managesGym={managesGym} />
      <ShortcutSheet />
      <GlobalShortcuts allowedHrefs={items.map((item) => item.href)} />
    </SessionStoreProvider>
  );
}

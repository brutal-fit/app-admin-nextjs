import type { ReactNode } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { can } from "@/lib/rbac/can";
import { navItems, routePermission } from "@/lib/rbac/permissions";
import { getSessionAccess } from "@/lib/rbac/session";
import { PATHNAME_HEADER } from "@/lib/utils/request-headers";
import { SessionStoreProvider } from "@/stores/session-store-provider";

/**
 * Resolves the session, applies the route's permission on full page loads, and renders the
 * sidebar and header. Pages repeat the route check because layouts are not re-rendered on
 * client navigation.
 */
export async function AdminShell({ children }: { children: ReactNode }) {
  const session = await getSessionAccess();
  if (session.status === "anonymous") redirect("/login");
  if (session.status === "no-access") redirect("/login?reason=no-access");
  if (session.status === "error") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold">The admin panel cannot load</h1>
        <p role="alert" className="text-sm text-danger">
          {session.error.message}
        </p>
        <Link href="/login" className="text-sm text-text underline underline-offset-4">
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

  const items = navItems()
    .filter((item) => item.permission === null || can(access.permissions, item.permission))
    .map(({ href, label }) => ({ href, label }));

  return (
    <SessionStoreProvider access={access}>
      <div className="flex min-h-dvh">
        <aside className="hidden w-60 shrink-0 flex-col gap-8 border-r border-border bg-surface p-4 md:flex">
          <Link
            href="/dashboard"
            className="px-3 text-lg font-extrabold tracking-widest focus-visible:outline-2 focus-visible:outline-accent"
          >
            BRUTAL <span className="font-medium text-text-muted">admin</span>
          </Link>
          <SidebarNav items={items} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-3">
            <div className="md:hidden">
              <SidebarNav items={items} orientation="horizontal" />
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold">{access.fullName || "Admin"}</p>
                <p className="text-xs text-text-muted">
                  {access.roles.map((role) => role.name).join(", ")}
                </p>
              </div>
              <SignOutButton />
            </div>
          </header>
          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </SessionStoreProvider>
  );
}

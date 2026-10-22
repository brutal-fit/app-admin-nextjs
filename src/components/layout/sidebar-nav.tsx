"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Activity,
  Archive,
  BarChart2,
  Bell,
  Calendar,
  FileText,
  Grid,
  Home,
  Inbox,
  LifeBuoy,
  List,
  Settings,
  Shield,
  Star,
  UserCheck,
  Users,
  type Icon,
} from "@/components/icons";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

export type SidebarNavItem = { href: string; label: string; section?: string };

// Icons are looked up here because components cannot cross the server-to-client boundary.
const NAV_ICONS: Record<string, Icon> = {
  "/dashboard": Grid,
  "/roles": Shield,
  "/users": Users,
  "/privacy": Archive,
  "/applications": FileText,
  "/trainers": UserCheck,
  "/gyms": Home,
  "/my-gym": Home,
  "/my-gym/requests": Inbox,
  "/my-gym/staff": Users,
  "/my-gym/bookings": Calendar,
  "/support": LifeBuoy,
  "/bookings": Calendar,
  "/reviews": Star,
  "/catalogue": List,
  "/settings": Settings,
  "/announcements": Bell,
  "/audit": Activity,
  "/analytics": BarChart2,
};

// "g" then this letter opens the page (src/lib/shortcuts.ts); shown as a hint in the sidebar.
const NAV_KEYS: Record<string, string> = {
  "/dashboard": "g d",
  "/applications": "g a",
  "/users": "g u",
  "/roles": "g r",
};

/** The item the path sits under: the longest href that is the path or one of its parents. */
function activeHref(items: readonly SidebarNavItem[], pathname: string): string | null {
  let best: string | null = null;
  for (const item of items) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (best === null || item.href.length > best.length)) best = item.href;
  }
  return best;
}

type NavGroup = { section: string | null; items: SidebarNavItem[] };

// Unsectioned items first, then one group per section in first-seen order.
function groupItems(items: readonly SidebarNavItem[]): NavGroup[] {
  const groups: NavGroup[] = [{ section: null, items: [] }];
  for (const item of items) {
    const section = item.section ?? null;
    let group = groups.find((g) => g.section === section);
    if (!group) {
      group = { section, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups.filter((g) => g.items.length > 0);
}

export function SidebarNav({
  items,
  orientation = "vertical",
}: {
  items: SidebarNavItem[];
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const reduce = usePrefersReducedMotion();
  const vertical = orientation === "vertical";
  const current = activeHref(items, pathname);
  const groups = vertical ? groupItems(items) : [{ section: null, items }];
  return (
    <nav aria-label="Main" className={cn(vertical && "flex flex-col gap-5")}>
      {groups.map((group) => {
        const headingId = group.section ? `nav-section-${orientation}-${group.section.replace(/\W+/g, "-").toLowerCase()}` : undefined;
        return (
          <div key={group.section ?? "main"} className="flex flex-col gap-1">
            {group.section ? (
              <p id={headingId} className="px-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {group.section}
              </p>
            ) : null}
            <ul
              aria-labelledby={headingId}
              className={cn("flex gap-1", vertical ? "flex-col" : "flex-wrap")}
            >
              {group.items.map((item) => {
                const active = item.href === current;
                const ItemIcon = NAV_ICONS[item.href];
                const label = !vertical && item.section ? `${item.section}: ${item.label}` : item.label;
                return (
                  <li key={item.href} className="relative">
                    {active ? (
                      // One indicator shared across items: it slides to the new active item.
                      <motion.span
                        layoutId={`nav-active-${orientation}`}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-md bg-accent"
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                      >
                        {vertical ? (
                          <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-primary" />
                        ) : null}
                      </motion.span>
                    ) : null}
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "focus-ring relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active ? "text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {ItemIcon ? <ItemIcon size={16} aria-hidden="true" /> : null}
                      <span className="flex-1">{label}</span>
                      {vertical && NAV_KEYS[item.href] ? (
                        <span aria-hidden="true" className="text-[10px] tracking-widest text-muted-foreground/70">
                          {NAV_KEYS[item.href]}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

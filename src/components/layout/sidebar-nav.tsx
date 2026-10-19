"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid, Shield, Users, type Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

export type SidebarNavItem = { href: string; label: string };

// Icons are looked up here because components cannot cross the server-to-client boundary.
const NAV_ICONS: Record<string, Icon> = {
  "/dashboard": Grid,
  "/roles": Shield,
  "/users": Users,
};

export function SidebarNav({
  items,
  orientation = "vertical",
}: {
  items: SidebarNavItem[];
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className={cn("flex gap-1", orientation === "vertical" ? "flex-col" : "flex-wrap")}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const ItemIcon = NAV_ICONS[item.href];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {ItemIcon ? <ItemIcon size={16} aria-hidden="true" /> : null}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

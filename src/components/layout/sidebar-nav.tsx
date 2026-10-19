"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export type SidebarNavItem = { href: string; label: string };

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
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                  active
                    ? "bg-surface-raised text-accent"
                    : "text-text-muted hover:bg-surface-raised hover:text-text",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

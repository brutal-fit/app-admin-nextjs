"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Activity,
  BarChart2,
  Bell,
  Calendar,
  FileText,
  Grid,
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

export type SidebarNavItem = { href: string; label: string };

// Icons are looked up here because components cannot cross the server-to-client boundary.
const NAV_ICONS: Record<string, Icon> = {
  "/dashboard": Grid,
  "/roles": Shield,
  "/users": Users,
  "/applications": FileText,
  "/trainers": UserCheck,
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
  return (
    <nav aria-label="Main">
      <ul className={cn("flex gap-1", vertical ? "flex-col" : "flex-wrap")}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const ItemIcon = NAV_ICONS[item.href];
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
                <span className="flex-1">{item.label}</span>
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
    </nav>
  );
}

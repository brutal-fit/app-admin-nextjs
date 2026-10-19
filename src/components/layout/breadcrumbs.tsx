"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "@/components/icons";

const SECTION_LABELS: Record<string, { label: string; detail: string }> = {
  dashboard: { label: "Dashboard", detail: "Details" },
  applications: { label: "Applications", detail: "Application" },
  users: { label: "Users", detail: "User" },
  roles: { label: "Roles", detail: "Role" },
  forbidden: { label: "No access", detail: "Details" },
};

/** Where the page sits: Admin / Section / Detail, from the path alone (no data lookups). */
export function Breadcrumbs() {
  const pathname = usePathname();
  const [section, id] = pathname.split("/").filter(Boolean);
  const known = section ? SECTION_LABELS[section] : undefined;
  const crumbs: { label: string; href: string | null }[] = [{ label: "Admin", href: "/dashboard" }];
  if (known && section) crumbs.push({ label: known.label, href: id ? `/${section}` : null });
  if (known && id) crumbs.push({ label: known.detail, href: null });

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              ) : null}
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="focus-ring truncate rounded-sm text-muted-foreground hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="truncate font-medium">
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

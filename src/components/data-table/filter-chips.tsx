import Link from "next/link";
import type { ReactNode } from "react";
import { X } from "@/components/icons";
import { cn } from "@/lib/utils";

export type FilterChip = {
  id: string;
  label: string;
  active: boolean;
} & ({ href: string; onToggle?: never } | { onToggle: () => void; href?: never });

const chipClass = (active: boolean) =>
  cn(
    "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
  );

/**
 * A labelled group of filter chips. Link chips change the URL (server filters); toggle chips
 * flip in-memory filters and report aria-pressed. "Clear all" shows only when a filter is on.
 */
export function FilterChips({
  label,
  chips,
  clear,
  children,
}: {
  label: string;
  chips: readonly FilterChip[];
  /** A link or a handler that resets every filter in this group. */
  clear?: { href: string } | { onClear: () => void };
  children?: ReactNode;
}) {
  const anyActive = chips.some((chip) => chip.active);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav aria-label={label}>
        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.id}>
              {chip.href !== undefined ? (
                <Link
                  href={chip.href}
                  aria-current={chip.active ? "page" : undefined}
                  className={chipClass(chip.active)}
                >
                  {chip.label}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-pressed={chip.active}
                  onClick={chip.onToggle}
                  className={chipClass(chip.active)}
                >
                  {chip.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
      {children}
      {clear && anyActive ? (
        "href" in clear ? (
          <Link
            href={clear.href}
            className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X size={14} aria-hidden="true" />
            Clear all
          </Link>
        ) : (
          <button
            type="button"
            onClick={clear.onClear}
            className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X size={14} aria-hidden="true" />
            Clear all
          </button>
        )
      ) : null}
    </div>
  );
}

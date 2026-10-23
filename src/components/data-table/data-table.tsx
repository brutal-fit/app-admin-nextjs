"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronDown, ChevronUp } from "@/components/icons";
import { StaggerItem, StaggerList } from "@/components/motion/stagger-list";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";
export type SortState = { columnId: string; direction: SortDirection } | null;

export type DataTableColumn<Row> = {
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Present when the column can be sorted; null values sort last either way. */
  sortValue?: (row: Row) => string | number | null;
  className?: string;
};

const LOADING_ROWS = 5;

function compare(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en-IN", { sensitivity: "base", numeric: true });
}

function nextSort(current: SortState, columnId: string): SortState {
  if (!current || current.columnId !== columnId) return { columnId, direction: "asc" };
  if (current.direction === "asc") return { columnId, direction: "desc" };
  return null;
}

/**
 * True while the element has columns hidden past its right edge. Read from the element on
 * scroll, resize and when the table inside it changes size, so the fade below follows what
 * is actually cut off rather than a guess at column widths.
 */
function useMoreToTheRight(element: HTMLElement | null): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!element) return () => {};
      element.addEventListener("scroll", notify, { passive: true });
      window.addEventListener("resize", notify);
      const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(notify);
      observer?.observe(element);
      if (element.firstElementChild) observer?.observe(element.firstElementChild);
      return () => {
        element.removeEventListener("scroll", notify);
        window.removeEventListener("resize", notify);
        observer?.disconnect();
      };
    },
    [element],
  );
  return useSyncExternalStore(
    subscribe,
    // One pixel of slack: fractional widths can leave scrollWidth a hair above the box.
    () => (element ? element.scrollLeft + element.clientWidth < element.scrollWidth - 1 : false),
    () => false,
  );
}

/**
 * The panel's table: sticky header, in-memory column sort, a result count, row hover quick
 * actions, keyboard rows (j/k or arrows move, Enter opens the row's first link), skeleton
 * loading and an empty state. A table wider than its column scrolls sideways inside its card,
 * with a thin scrollbar that brightens on hover and a fade on the right edge while columns
 * are still hidden there. Data stays the server's: sorting reorders what was loaded.
 */
export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  caption,
  countLabel,
  empty,
  toolbar,
  rowActions,
  initialSort = null,
  loading = false,
}: {
  rows: readonly Row[];
  columns: readonly DataTableColumn<Row>[];
  rowKey: (row: Row) => string;
  caption: string;
  /** "3 roles"; shown in the table header bar and announced politely. */
  countLabel: (count: number) => string;
  empty: ReactNode;
  toolbar?: ReactNode;
  rowActions?: (row: Row) => ReactNode;
  initialSort?: SortState;
  loading?: boolean;
}) {
  const [sort, setSort] = useState<SortState>(initialSort);
  const [activeIndex, setActiveIndex] = useState(0);
  const body = useRef<HTMLTableSectionElement>(null);
  // State, not a ref: the scroller mounts only once rows exist, and the overflow
  // subscription has to follow it.
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const moreToTheRight = useMoreToTheRight(scroller);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((candidate) => candidate.id === sort.columnId);
    const value = column?.sortValue;
    if (!value) return rows;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      // Nulls stay last in both directions.
      if (av === null || bv === null) return compare(av, bv);
      return compare(av, bv) * factor;
    });
  }, [rows, columns, sort]);

  const active = Math.min(activeIndex, Math.max(sorted.length - 1, 0));

  function focusRow(index: number) {
    const target = body.current?.querySelectorAll<HTMLTableRowElement>("tr[data-row-nav]")[index];
    if (!target) return;
    setActiveIndex(index);
    target.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableSectionElement>) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const row = (event.target as HTMLElement).closest<HTMLTableRowElement>("tr[data-row-nav]");
    if (!row) return;
    const index = Number(row.dataset.rowIndex ?? "0");
    const onRowItself = event.target === row;
    switch (event.key) {
      case "j":
      case "ArrowDown":
        event.preventDefault();
        focusRow(Math.min(index + 1, sorted.length - 1));
        break;
      case "k":
      case "ArrowUp":
        event.preventDefault();
        focusRow(Math.max(index - 1, 0));
        break;
      case "Home":
        if (!onRowItself) return;
        event.preventDefault();
        focusRow(0);
        break;
      case "End":
        if (!onRowItself) return;
        event.preventDefault();
        focusRow(sorted.length - 1);
        break;
      case "Enter":
        // Only on the row: Enter on a link or button inside it keeps its own meaning.
        if (!onRowItself) return;
        event.preventDefault();
        row.querySelector<HTMLAnchorElement>("a[href]")?.click();
        break;
    }
  }

  const count = loading ? null : rows.length;
  const columnCount = columns.length + (rowActions ? 1 : 0);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-tile">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <p aria-live="polite" className="text-sm font-medium text-muted-foreground">
          {count === null ? "Loading..." : countLabel(count)}
        </p>
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>
      {!loading && rows.length === 0 ? (
        <div className="p-4">{empty}</div>
      ) : (
        <div className="relative">
          <div
            ref={setScroller}
            data-table-scroll=""
            className="max-h-[min(70vh,48rem)] overflow-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] hover:[scrollbar-color:var(--muted-foreground)_transparent]"
          >
            <table data-slot="table" className="w-full caption-bottom text-sm">
              <TableCaption className="sr-only">
                {caption}
                {columns.some((column) => column.sortValue)
                  ? ". Column headers with buttons sort the table."
                  : ""}
              </TableCaption>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)] [&_tr]:border-b-0">
                <TableRow className="hover:bg-transparent">
                  {columns.map((column) => {
                    const sortedBy = sort?.columnId === column.id ? sort.direction : null;
                    return (
                      <TableHead
                        key={column.id}
                        className={cn("px-4", column.className)}
                        aria-sort={
                          column.sortValue
                            ? sortedBy === "asc"
                              ? "ascending"
                              : sortedBy === "desc"
                                ? "descending"
                                : "none"
                            : undefined
                        }
                      >
                        {column.sortValue ? (
                          <button
                            type="button"
                            onClick={() => setSort((current) => nextSort(current, column.id))}
                            className="focus-ring -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 hover:text-foreground"
                          >
                            {column.header}
                            {sortedBy === "asc" ? (
                              <ChevronUp size={14} aria-hidden="true" />
                            ) : sortedBy === "desc" ? (
                              <ChevronDown size={14} aria-hidden="true" />
                            ) : (
                              <ChevronDown size={14} aria-hidden="true" className="opacity-30" />
                            )}
                          </button>
                        ) : (
                          column.header
                        )}
                      </TableHead>
                    );
                  })}
                  {rowActions ? (
                    <TableHead className="px-4 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableBody>
                  {Array.from({ length: LOADING_ROWS }, (_, index) => (
                    <TableRow key={index} aria-hidden="true">
                      {Array.from({ length: columnCount }, (_, cell) => (
                        <TableCell key={cell} className="px-4 py-3">
                          <Skeleton className="h-4 w-full max-w-40" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              ) : (
                <StaggerList>
                  <TableBody ref={body} data-table-body="" onKeyDown={onKeyDown}>
                    {sorted.map((row, index) => (
                      <StaggerItem
                        as="tr"
                        key={rowKey(row)}
                        index={index}
                        data-row-nav=""
                        data-row-index={index}
                        data-slot="table-row"
                        tabIndex={index === active ? 0 : -1}
                        onFocus={() => setActiveIndex(index)}
                        className="group border-b transition-colors last:border-b-0 hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                      >
                        {columns.map((column) => (
                          <TableCell key={column.id} className={cn("px-4", column.className)}>
                            {column.cell(row)}
                          </TableCell>
                        ))}
                        {rowActions ? (
                          <TableCell className="px-4 text-right">
                            {/* Hidden until hover or focus on pointer devices; always shown on touch. */}
                            <span className="inline-flex justify-end gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                              {rowActions(row)}
                            </span>
                          </TableCell>
                        ) : null}
                      </StaggerItem>
                    ))}
                  </TableBody>
                </StaggerList>
              )}
            </table>
          </div>
          {moreToTheRight ? (
            <div
              aria-hidden="true"
              data-scroll-fade=""
              className="pointer-events-none absolute inset-y-0 right-0 z-20 w-12 bg-linear-to-l from-card to-transparent"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

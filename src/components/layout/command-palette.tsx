"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowRight,
  BarChart2,
  Bell,
  Calendar,
  CreditCard,
  FileText,
  Flag,
  Grid,
  HelpCircle,
  Home,
  Inbox,
  LifeBuoy,
  List,
  MessageCircle,
  Plus,
  Repeat,
  Settings,
  Shield,
  Star,
  UserCheck,
  UserPlus,
  Users,
  type Icon,
} from "@/components/icons";
import { useApplePlatform } from "@/components/layout/use-apple-platform";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { analyticsHref } from "@/features/analytics/schemas";
import { applicationListHref } from "@/features/applications/schemas";
import { EMPTY_BOOKING_FILTERS, bookingListHref } from "@/features/bookings/schemas";
import { catalogueHref } from "@/features/catalogue/schemas";
import { EMPTY_PRIVACY_FILTERS, privacyListHref } from "@/features/privacy/schemas";
import { EMPTY_REVIEW_FILTERS, reviewListHref } from "@/features/reviews/schemas";
import { EMPTY_SUPPORT_FILTERS, supportListHref } from "@/features/support/schemas";
import { listUsersAction } from "@/features/users/actions";
import { can } from "@/lib/rbac/can";
import { sessionNavItems, type PermissionKey } from "@/lib/rbac/permissions";
import { SERVICE_ROLE_MISSING_MESSAGE } from "@/lib/supabase/errors";
import { istDateString } from "@/lib/utils/time";
import { useCommandStore } from "@/stores/command-store";
import { useSessionStore } from "@/stores/session-store-provider";
import type { AdminUserRow } from "@/types/database";

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 8;

const PAGE_ICONS: Record<string, Icon> = {
  "/dashboard": Grid,
  "/applications": FileText,
  "/users": Users,
  "/privacy": Archive,
  "/roles": Shield,
  "/trainers": UserCheck,
  "/gyms": Home,
  "/my-gym": Home,
  "/my-gym/requests": Inbox,
  "/my-gym/staff": Users,
  "/my-gym/bookings": Calendar,
  "/support": LifeBuoy,
  "/bookings": Calendar,
  "/subscriptions": Repeat,
  "/coaching": MessageCircle,
  "/payments": CreditCard,
  "/reviews": Star,
  "/catalogue": List,
  "/settings": Settings,
  "/announcements": Bell,
  "/audit": Activity,
  "/analytics": BarChart2,
};

const PAGE_KEYS: Record<string, string> = {
  "/dashboard": "G D",
  "/applications": "G A",
  "/users": "G U",
  "/roles": "G R",
};

type Jump = { id: string; label: string; href: string; permission: PermissionKey };

const JUMPS: readonly Jump[] = [
  {
    id: "applications-needs-information",
    label: "Applications: needs information",
    href: applicationListHref("needs_information"),
    permission: "applications.read",
  },
  {
    id: "applications-awaiting-review",
    label: "Applications: awaiting review",
    href: applicationListHref("awaiting_review"),
    permission: "applications.read",
  },
  {
    id: "applications-unreviewed-documents",
    label: "Applications: unreviewed documents",
    href: applicationListHref("all", true),
    permission: "documents.review",
  },
  {
    id: "trainers-unlisted",
    label: "Trainers: not listed",
    href: "/trainers?listed=unlisted",
    permission: "trainers.read",
  },
  {
    id: "bookings-requested",
    label: "Bookings: requests pending",
    href: bookingListHref(EMPTY_BOOKING_FILTERS, { status: "requested" }),
    permission: "bookings.read",
  },
  {
    id: "reviews-reported",
    label: "Reviews: reported",
    href: reviewListHref(EMPTY_REVIEW_FILTERS, { reported: "yes" }),
    permission: "reviews.moderate",
  },
  {
    id: "catalogue-cities-areas",
    label: "Catalogue: cities and areas",
    href: catalogueHref("area"),
    permission: "catalogue.manage",
  },
  {
    id: "analytics-last-7-days",
    label: "Analytics: last 7 days",
    href: analyticsHref({ preset: 7 }),
    permission: "metrics.read",
  },
  {
    id: "privacy-pending",
    label: "Privacy: pending requests",
    href: privacyListHref(EMPTY_PRIVACY_FILTERS, { status: "pending" }),
    permission: "privacy.process",
  },
  {
    id: "users-joined-week",
    label: "Users: joined in the last 7 days",
    href: "/users?joined=week",
    permission: "users.read",
  },
];

type UserSearch =
  | { status: "idle" }
  | { status: "searching"; query: string }
  | { status: "done"; query: string; users: AdminUserRow[] }
  | { status: "error"; query: string; message: string };

/**
 * Cmd/Ctrl+K: every page and quick filter the session may open, a live user search
 * (admin_list_users, debounced) and quick actions, each gated by the same permission keys
 * as the pages behind them. Items the session lacks are not listed at all.
 */
export function CommandPalette({
  serviceRoleConfigured,
  managesGym = false,
}: {
  serviceRoleConfigured: boolean;
  /** True when the session manages a gym (decided on the server), which opens the gym area. */
  managesGym?: boolean;
}) {
  const router = useRouter();
  const apple = useApplePlatform();
  const open = useCommandStore((state) => state.paletteOpen);
  const setOpen = useCommandStore((state) => state.setPaletteOpen);
  const setShortcutsOpen = useCommandStore((state) => state.setShortcutsOpen);
  const permissions = useSessionStore((state) => state.access?.permissions);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<UserSearch>({ status: "idle" });
  const latest = useRef(0);

  const allowed = (key: PermissionKey) => can(permissions, key);
  const canSearchUsers = allowed("users.read");
  const pages = useMemo(
    () => sessionNavItems(permissions ?? [], { managesGym }),
    [permissions, managesGym],
  );
  const jumps = JUMPS.filter((jump) => can(permissions, jump.permission));

  const trimmed = query.trim();
  useEffect(() => {
    if (!canSearchUsers || trimmed.length < SEARCH_MIN_LENGTH) return;
    const requestId = ++latest.current;
    const timer = setTimeout(async () => {
      setSearch({ status: "searching", query: trimmed });
      const result = await listUsersAction({ query: trimmed, limit: SEARCH_LIMIT, offset: 0 });
      // A slower, older response must not overwrite a newer one.
      if (requestId !== latest.current) return;
      setSearch(
        result.ok
          ? { status: "done", query: trimmed, users: result.data }
          : { status: "error", query: trimmed, message: result.error.message },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, canSearchUsers]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setSearch({ status: "idle" });
    }
  }

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  const showUsers = canSearchUsers && trimmed.length >= SEARCH_MIN_LENGTH;
  const current = search.status !== "idle" && search.query === trimmed ? search : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Type to filter pages, quick filters and actions{canSearchUsers ? ", or search users by name or email" : ""}.
          Arrow keys move, Enter opens.
        </DialogDescription>
        <Command
          loop
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5"
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={canSearchUsers ? "Search pages, actions or users..." : "Search pages and actions..."}
            className="h-12"
          />
          <CommandList className="max-h-[min(60vh,26rem)]">
            <CommandEmpty>
              {showUsers && current?.status === "searching" ? "Searching users..." : "No match."}
            </CommandEmpty>

            <CommandGroup heading="Pages">
              {pages.map((page) => {
                const PageIcon = PAGE_ICONS[page.href] ?? ArrowRight;
                const label = page.section ? `${page.section}: ${page.label}` : page.label;
                return (
                  <CommandItem key={page.href} value={`page ${label}`} onSelect={() => go(page.href)}>
                    <PageIcon size={16} aria-hidden="true" />
                    {label}
                    {PAGE_KEYS[page.href] ? <CommandShortcut>{PAGE_KEYS[page.href]}</CommandShortcut> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {jumps.length > 0 ? (
              <CommandGroup heading="Quick filters">
                {jumps.map((jump) => (
                  <CommandItem key={jump.id} value={jump.label} onSelect={() => go(jump.href)}>
                    <ArrowRight size={16} aria-hidden="true" />
                    {jump.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {showUsers ? (
              <CommandGroup heading="Users">
                {current?.status === "done" && current.users.length === 0 ? (
                  <CommandItem value={`users-none ${trimmed}`} disabled forceMount>
                    No user matches &quot;{trimmed}&quot;.
                  </CommandItem>
                ) : null}
                {current?.status === "error" ? (
                  <CommandItem value={`users-error ${trimmed}`} disabled forceMount>
                    {current.message}
                  </CommandItem>
                ) : null}
                {current?.status === "searching" || !current ? (
                  <CommandItem value={`users-searching ${trimmed}`} disabled forceMount>
                    Searching users...
                  </CommandItem>
                ) : null}
                {current?.status === "done"
                  ? current.users.map((user) => (
                      <CommandItem
                        key={user.id}
                        // The server already matched; forceMount keeps the row even when
                        // the match was on a field the palette does not show.
                        forceMount
                        value={`user ${user.id} ${user.full_name} ${user.email ?? ""}`}
                        onSelect={() => go(`/users/${user.id}`)}
                      >
                        <Users size={16} aria-hidden="true" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{user.full_name || "Unnamed"}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {user.email ?? "No email"}
                          </span>
                        </span>
                      </CommandItem>
                    ))
                  : null}
              </CommandGroup>
            ) : null}

            <CommandSeparator />
            <CommandGroup heading="Actions">
              {allowed("support.read") ? (
                <CommandItem value="action open support queue cases" onSelect={() => go("/support")}>
                  <LifeBuoy size={16} aria-hidden="true" />
                  Open support queue
                </CommandItem>
              ) : null}
              {allowed("support.read") ? (
                <CommandItem
                  value="action safety cases support reports"
                  onSelect={() => go(supportListHref(EMPTY_SUPPORT_FILTERS, { category: "safety" }))}
                >
                  <AlertCircle size={16} aria-hidden="true" />
                  Safety cases
                </CommandItem>
              ) : null}
              {allowed("bookings.read") ? (
                <CommandItem
                  value="action bookings today sessions"
                  // Today is read when the item is chosen, so a palette left open overnight stays right.
                  onSelect={() => {
                    const today = istDateString();
                    go(bookingListHref(EMPTY_BOOKING_FILTERS, { from: today, to: today }));
                  }}
                >
                  <Calendar size={16} aria-hidden="true" />
                  Bookings today
                </CommandItem>
              ) : null}
              {allowed("reviews.moderate") ? (
                <CommandItem
                  value="action reported reviews moderate"
                  onSelect={() => go(reviewListHref(EMPTY_REVIEW_FILTERS, { reported: "yes" }))}
                >
                  <Flag size={16} aria-hidden="true" />
                  Reported reviews
                </CommandItem>
              ) : null}
              {allowed("announcements.send") ? (
                <CommandItem
                  value="action send announcement notification inbox"
                  onSelect={() => go("/announcements")}
                >
                  <Bell size={16} aria-hidden="true" />
                  Send an announcement
                </CommandItem>
              ) : null}
              {allowed("rbac.manage") ? (
                <CommandItem value="action new role" onSelect={() => go("/roles?new=role")}>
                  <Plus size={16} aria-hidden="true" />
                  New role
                </CommandItem>
              ) : null}
              {allowed("users.manage") ? (
                <CommandItem
                  value="action invite user new account"
                  disabled={!serviceRoleConfigured}
                  onSelect={() => go("/users?new=user")}
                >
                  <UserPlus size={16} aria-hidden="true" />
                  <span className="flex flex-col">
                    <span>Invite user</span>
                    {!serviceRoleConfigured ? (
                      <span className="text-xs text-muted-foreground">{SERVICE_ROLE_MISSING_MESSAGE}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ) : null}
              <CommandItem value="action keyboard shortcuts help" onSelect={() => setShortcutsOpen(true)}>
                <HelpCircle size={16} aria-hidden="true" />
                Keyboard shortcuts
                <CommandShortcut>?</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>Up and down to move, Enter to open, Esc to close</span>
            <span>{apple ? "Cmd" : "Ctrl"} K</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

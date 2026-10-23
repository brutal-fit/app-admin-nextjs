"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Search } from "@/components/icons";
import { FilterChips } from "@/components/data-table/filter-chips";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listUsersAction, userAvatarsAction, userPhonesAction } from "@/features/users/actions";
import { UserTable } from "@/features/users/components/user-table";
import { USER_PAGE_SIZE, USER_FILTERS, type UserFilter } from "@/features/users/schemas";
import type { UserAvatarMap } from "@/lib/db/avatars";
import type { UserPhoneMap } from "@/lib/db/phones";
import type { AdminUserRow } from "@/types/database";

const DEBOUNCE_MS = 300;

const FILTER_LABELS: Record<UserFilter, string> = {
  joined_week: "Joined last 7 days",
  trainers: "Trainers",
  clients: "Clients",
  suspended: "Suspended",
  admins: "Has admin roles",
};

function matches(user: AdminUserRow, filter: UserFilter, joinedSince: string): boolean {
  switch (filter) {
    case "joined_week":
      return Boolean(user.created_at) && user.created_at >= joinedSince;
    case "trainers":
      return user.platform_role === "trainer";
    case "clients":
      return user.platform_role === "client";
    case "suspended":
      return user.account_status === "suspended";
    case "admins":
      return user.roles.length > 0;
  }
}

/**
 * Search box over admin_list_users (results come from the server on every query) plus
 * filter chips that narrow the rows already loaded. The count says when the server page was
 * full, so a filter over a partial page never reads as a total.
 */
export function UserSearch({
  initialUsers,
  initialAvatars = {},
  initialPhones = {},
  roleNames = {},
  initialFilters = [],
  joinedSince,
  pageSize = USER_PAGE_SIZE,
}: {
  initialUsers: AdminUserRow[];
  /** Avatars the server loaded for initialUsers; rows without one show initials. */
  initialAvatars?: UserAvatarMap;
  /** Phones the server loaded for initialUsers (masked without users.manage). */
  initialPhones?: UserPhoneMap;
  /** Admin role names by key, so the table shows "Gym manager" rather than gym_manager. */
  roleNames?: Readonly<Record<string, string>>;
  initialFilters?: UserFilter[];
  /** ISO timestamp seven days before the server render, for "Joined last 7 days". */
  joinedSince: string;
  /** How many rows the server loaded; a full page means there may be more. */
  pageSize?: number;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [avatars, setAvatars] = useState<UserAvatarMap>(initialAvatars);
  const [phones, setPhones] = useState<UserPhoneMap>(initialPhones);
  const [loadedLimit, setLoadedLimit] = useState(pageSize);
  const [filters, setFilters] = useState<UserFilter[]>(initialFilters);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);

  function search(query: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const requestId = ++latest.current;
      startTransition(async () => {
        const result = await listUsersAction({ query, limit: USER_PAGE_SIZE, offset: 0 });
        // A slower, older response must not overwrite a newer one.
        if (requestId !== latest.current) return;
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        setError(null);
        setUsers(result.data);
        setLoadedLimit(USER_PAGE_SIZE);
        loadAvatars(result.data);
        loadPhones(result.data);
      });
    }, DEBOUNCE_MS);
  }

  // Avatars for rows not seen yet, once per result; a failure leaves initials in place.
  function loadAvatars(rows: AdminUserRow[]) {
    const missing = rows.map((user) => user.id).filter((id) => !(id in avatars));
    if (missing.length === 0) return;
    void userAvatarsAction({ ids: missing }).then((result) => {
      if (result.ok) setAvatars((current) => ({ ...current, ...result.data }));
    });
  }

  // Phones for rows not seen yet; a failure leaves "Not loaded" on those rows.
  function loadPhones(rows: AdminUserRow[]) {
    const missing = rows.map((user) => user.id).filter((id) => !(id in phones));
    if (missing.length === 0) return;
    void userPhonesAction({ ids: missing }).then((result) => {
      if (result.ok) setPhones((current) => ({ ...current, ...result.data }));
    });
  }

  const shown = useMemo(
    () => users.filter((user) => filters.every((filter) => matches(user, filter, joinedSince))),
    [users, filters, joinedSince],
  );
  const fullPage = users.length >= loadedLimit;

  function toggle(filter: UserFilter) {
    setFilters((current) =>
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-md flex-col gap-2">
        <Label htmlFor="user-search">Search users</Label>
        <div className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="user-search"
            type="search"
            placeholder="Name, email or phone"
            autoComplete="off"
            className="pl-9"
            data-shortcut-search=""
            aria-keyshortcuts="/"
            onChange={(event) => search(event.target.value)}
          />
        </div>
      </div>
      <FilterChips
        label="Filter users"
        chips={USER_FILTERS.map((filter) => ({
          id: filter,
          label: FILTER_LABELS[filter],
          active: filters.includes(filter),
          onToggle: () => toggle(filter),
        }))}
        clear={{ onClear: () => setFilters([]) }}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <UserTable
        users={shown}
        avatars={avatars}
        phones={phones}
        roleNames={roleNames}
        loading={pending}
        countLabel={(count) => {
          const noun = count === 1 ? "user" : "users";
          const base = filters.length > 0 ? `${count} ${noun} of ${users.length} loaded` : `${count} ${noun} shown`;
          return fullPage ? `${base} (first ${loadedLimit}; refine the search)` : base;
        }}
        emptyDescription={
          filters.length > 0
            ? "No loaded user matches these filters. Clear a filter or search for someone."
            : "Try a different name, email or phone."
        }
      />
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { Search } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listUsersAction } from "@/features/users/actions";
import { UserTable } from "@/features/users/components/user-table";
import { USER_PAGE_SIZE } from "@/features/users/schemas";
import type { AdminUserRow } from "@/types/database";

const DEBOUNCE_MS = 300;

/** Search box over admin_list_users; results come from the server on every query. */
export function UserSearch({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
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
      });
    }, DEBOUNCE_MS);
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
            placeholder="Name or email"
            autoComplete="off"
            className="pl-9"
            onChange={(event) => search(event.target.value)}
          />
        </div>
      </div>
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {pending
          ? "Searching..."
          : `${users.length} ${users.length === 1 ? "user" : "users"} shown` +
            (users.length === USER_PAGE_SIZE ? ` (first ${USER_PAGE_SIZE}; refine the search)` : "")}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <UserTable users={users} />
    </div>
  );
}

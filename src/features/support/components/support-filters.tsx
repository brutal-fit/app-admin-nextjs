"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Search, X } from "@/components/icons";
import { FilterChips } from "@/components/data-table/filter-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamState } from "@/features/support/api";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  hasSupportFilters,
  supportListHref,
  type SupportFilters as Filters,
} from "@/features/support/schemas";

// Radix Select cannot hold an empty value, so "anyone" has its own token.
const ANY_ASSIGNEE = "any";

/**
 * Every queue filter lives in the URL (status, category, assignee, q, page), so a filtered
 * queue can be shared and the back button restores it. Chips are links; search and the
 * assignee select navigate. Gated by support.read.
 */
export function SupportFilters({ filters, team }: { filters: Filters; team: TeamState }) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [pending, startTransition] = useTransition();

  function navigate(href: string) {
    startTransition(() => router.push(href));
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(supportListHref(filters, { search: search.trim() }));
  }

  const members = team.kind === "ok" ? team.members : [];
  const selectedUnknown =
    filters.assigneeId !== null && !members.some((member) => member.id === filters.assigneeId);

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <FilterChips
        label="Filter by status"
        chips={[
          {
            id: "all",
            label: "All statuses",
            active: filters.status === null,
            href: supportListHref(filters, { status: null }),
          },
          ...SUPPORT_STATUSES.map((status) => ({
            id: status,
            label: SUPPORT_STATUS_LABELS[status],
            active: filters.status === status,
            href: supportListHref(filters, { status: filters.status === status ? null : status }),
          })),
        ]}
      />
      <FilterChips
        label="Filter by category"
        chips={[
          {
            id: "all",
            label: "All categories",
            active: filters.category === null,
            href: supportListHref(filters, { category: null }),
          },
          ...SUPPORT_CATEGORIES.map((category) => ({
            id: category,
            label: SUPPORT_CATEGORY_LABELS[category],
            active: filters.category === category,
            href: supportListHref(filters, {
              category: filters.category === category ? null : category,
            }),
          })),
        ]}
      />

      <div className="flex flex-wrap items-end gap-3">
        <form onSubmit={onSearch} role="search" className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="support-search">Search</Label>
            <Input
              id="support-search"
              type="search"
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Subject, details, target or reporter"
              className="w-64 sm:w-80"
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            <Search size={16} aria-hidden="true" />
            Search
          </Button>
        </form>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="support-assignee">Assignee</Label>
          <Select
            value={filters.assigneeId ?? ANY_ASSIGNEE}
            onValueChange={(value) =>
              navigate(supportListHref(filters, { assigneeId: value === ANY_ASSIGNEE ? null : value }))
            }
            disabled={pending || (team.kind !== "ok" && filters.assigneeId === null)}
          >
            <SelectTrigger id="support-assignee" className="w-56" aria-describedby="support-assignee-hint">
              <SelectValue placeholder="Anyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_ASSIGNEE}>Anyone</SelectItem>
              {selectedUnknown && filters.assigneeId ? (
                <SelectItem value={filters.assigneeId}>Selected team member</SelectItem>
              ) : null}
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasSupportFilters(filters) ? (
          <Link
            href="/support"
            className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <X size={14} aria-hidden="true" />
            Clear all
          </Link>
        ) : null}
      </div>
      <p id="support-assignee-hint" className="text-xs text-muted-foreground">
        {team.kind === "hidden"
          ? team.reason
          : team.kind === "error"
            ? `The team list did not load: ${team.message}`
            : team.capped
              ? "Team members come from the 200 most recent accounts; older admins may be missing."
              : "Team members are users holding an admin role."}
      </p>
    </div>
  );
}

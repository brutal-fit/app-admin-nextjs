"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Filter, X } from "@/components/icons";
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
  AUDIT_ACTIONS,
  AUDIT_SEARCH_MAX,
  auditActionLabel,
  auditListHref,
  hasAuditFilters,
  isUuid,
  type AuditFilters as Filters,
} from "@/features/audit/schemas";
import { isIsoDate } from "@/lib/utils/time";

// Radix Select cannot hold an empty value, so "any" has its own token.
const ANY = "any";

const removeClass =
  "focus-ring inline-flex items-center gap-1.5 rounded-full border border-primary px-3 py-1 text-sm text-foreground hover:bg-accent";

/**
 * Every audit filter lives in the URL (actor, action, target, from, to, q, page), so a
 * filtered log can be shared and the back button restores it. The two selects navigate at
 * once; search, target and dates apply together. Gated by audit.read.
 */
export function AuditFilters({
  filters,
  team,
  actorName,
  today,
}: {
  filters: Filters;
  team: TeamState;
  actorName: string | null;
  /** Today in India, "YYYY-MM-DD", read on the server. */
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search);
  const [target, setTarget] = useState(filters.targetId ?? "");
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");
  const [targetError, setTargetError] = useState<string | null>(null);

  function navigate(href: string) {
    startTransition(() => router.push(href));
  }

  function onApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetText = target.trim();
    if (targetText !== "" && !isUuid(targetText)) {
      setTargetError("A target is an id like 3f2b9c1e-0000-0000-0000-000000000000.");
      return;
    }
    setTargetError(null);
    navigate(
      auditListHref(filters, {
        search: search.trim(),
        targetId: targetText === "" ? null : targetText,
        from: isIsoDate(from) ? from : null,
        to: isIsoDate(to) ? to : null,
      }),
    );
  }

  const members = team.kind === "ok" ? team.members : [];
  const actorUnknown =
    filters.actorId !== null && !members.some((member) => member.id === filters.actorId);
  const actionUnknown = filters.action !== null && !(AUDIT_ACTIONS as readonly string[]).includes(filters.action);

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-actor">Actor</Label>
          <Select
            value={filters.actorId ?? ANY}
            onValueChange={(value) => navigate(auditListHref(filters, { actorId: value === ANY ? null : value }))}
            disabled={pending || (team.kind !== "ok" && filters.actorId === null)}
          >
            <SelectTrigger id="audit-actor" className="w-56" aria-describedby="audit-actor-hint">
              <SelectValue placeholder="Anyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Anyone</SelectItem>
              {actorUnknown && filters.actorId ? (
                <SelectItem value={filters.actorId}>{actorName ?? "Selected admin"}</SelectItem>
              ) : null}
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-action">Action</Label>
          <Select
            value={filters.action ?? ANY}
            onValueChange={(value) => navigate(auditListHref(filters, { action: value === ANY ? null : value }))}
            disabled={pending}
          >
            <SelectTrigger id="audit-action" className="w-64">
              <SelectValue placeholder="Every action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Every action</SelectItem>
              {actionUnknown && filters.action ? (
                <SelectItem value={filters.action}>{filters.action}</SelectItem>
              ) : null}
              {AUDIT_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {auditActionLabel(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <form onSubmit={onApply} role="search" aria-label="Search the audit log" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-search">Search</Label>
          <Input
            id="audit-search"
            type="search"
            value={search}
            maxLength={AUDIT_SEARCH_MAX}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Action, actor or detail text"
            className="w-64 sm:w-72"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-target">Target id</Label>
          <Input
            id="audit-target"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="Any target"
            aria-invalid={targetError ? true : undefined}
            aria-describedby={targetError ? "audit-target-error" : undefined}
            className="w-72 font-mono text-xs"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-from">From</Label>
          <Input
            id="audit-from"
            type="date"
            value={from}
            max={today}
            onChange={(event) => setFrom(event.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-to">To</Label>
          <Input
            id="audit-to"
            type="date"
            value={to}
            max={today}
            onChange={(event) => setTo(event.target.value)}
            className="w-44"
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          <Filter size={16} aria-hidden="true" />
          Apply
        </Button>
        {hasAuditFilters(filters) ? (
          <Link
            href="/audit"
            className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <X size={14} aria-hidden="true" />
            Clear all
          </Link>
        ) : null}
      </form>
      {targetError ? (
        <p id="audit-target-error" role="alert" className="text-sm text-destructive">
          {targetError}
        </p>
      ) : null}

      {filters.targetId ? (
        <div>
          <Link href={auditListHref(filters, { targetId: null })} className={removeClass}>
            Target: <span className="font-mono text-xs">{filters.targetId}</span>
            <span className="sr-only">, remove this filter</span>
            <X size={14} aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <p id="audit-actor-hint" className="text-xs text-muted-foreground">
        Dates are India time and include both ends.{" "}
        {team.kind === "hidden"
          ? `${team.reason} Filter by an actor from a row instead.`
          : team.kind === "error"
            ? `The team list did not load: ${team.message}`
            : team.capped
              ? "Actors come from the 200 most recent accounts holding an admin role; filter older ones from a row."
              : "Actors are users holding an admin role; a name in a row also filters by that actor."}
      </p>
    </div>
  );
}

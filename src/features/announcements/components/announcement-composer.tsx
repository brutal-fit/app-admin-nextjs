"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { Send, Users, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { estimateRecipientsAction, sendAnnouncementAction } from "@/features/announcements/actions";
import type { CityChoice } from "@/features/announcements/api";
import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_RECIPIENT_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  AUDIENCES,
  AUDIENCE_LABELS,
  peopleCount,
  routesForAudience,
  sendAnnouncementSchema,
  type Audience,
  type RecipientEstimate,
  type Segment,
  type SendAnnouncementInput,
} from "@/features/announcements/schemas";
import { listUsersAction } from "@/features/users/actions";
import { showToast } from "@/stores/toast-store";
import type { AdminUserRow } from "@/types/database";

const ANY_CITY = "__any";
const NO_ROUTE = "__none";
const ESTIMATE_DEBOUNCE_MS = 300;
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 8;

type EstimateState =
  | { key: string; status: "done"; estimate: RecipientEstimate }
  | { key: string; status: "error"; message: string };

type UserSearch =
  | { query: string; status: "done"; users: AdminUserRow[] }
  | { query: string; status: "error"; message: string };

function buildSegment(audience: Audience, city: string, user: AdminUserRow | null): Segment | null {
  switch (audience) {
    case "all":
      return { audience: "all" };
    case "clients":
      return { audience: "clients" };
    case "trainers":
      return city === ANY_CITY ? { audience: "trainers" } : { audience: "trainers", city };
    case "user":
      return user ? { audience: "user", user_id: user.id } : null;
  }
}

function audienceSummary(audience: Audience, city: string, user: AdminUserRow | null): string {
  if (audience === "trainers") return city === ANY_CITY ? "All trainers" : `Trainers in ${city}`;
  if (audience === "user") return user ? user.full_name || user.email || "One person" : "One person";
  return audience === "all" ? "Everyone" : "All clients";
}

const NO_RECIPIENTS = "No one matches this audience";

function estimateText(estimate: RecipientEstimate): string {
  if (estimate.count === 0) return `${NO_RECIPIENTS}.`;
  if (estimate.count > ANNOUNCEMENT_RECIPIENT_MAX) {
    return `${peopleCount(estimate.count)} match, over the server's limit of ${ANNOUNCEMENT_RECIPIENT_MAX.toLocaleString("en-IN")} per send. Narrow it down.`;
  }
  return `${peopleCount(estimate.count)} would receive this now.`;
}

/**
 * Writes an in-app announcement and sends it through admin_send_notification. "Who receives
 * this" is the exact count from admin_count_recipients before sending (zero disables Send);
 * the confirmation repeats it, and the count shown after sending is the one the send returns.
 * Gated by announcements.send.
 */
export function AnnouncementComposer({
  cities,
  citiesError,
  canSearchUsers,
  searchUsersReason,
}: {
  cities: readonly CityChoice[];
  citiesError: string | null;
  canSearchUsers: boolean;
  /** Why the one-person audience is unavailable; shown when canSearchUsers is false. */
  searchUsersReason: string;
}) {
  const [audience, setAudience] = useState<Audience>("all");
  const [city, setCity] = useState(ANY_CITY);
  const [user, setUser] = useState<AdminUserRow | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [search, setSearch] = useState<UserSearch | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [route, setRoute] = useState(NO_ROUTE);
  const [estimate, setEstimate] = useState<EstimateState | null>(null);
  const [confirming, setConfirming] = useState<SendAnnouncementInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const latestEstimate = useRef(0);
  const latestSearch = useRef(0);

  const segment = useMemo(() => buildSegment(audience, city, user), [audience, city, user]);
  const segmentKey = segment ? JSON.stringify(segment) : null;
  const routes = routesForAudience(audience, user?.platform_role ?? null);

  useEffect(() => {
    if (!segmentKey) return;
    const requestId = ++latestEstimate.current;
    const timer = setTimeout(async () => {
      const result = await estimateRecipientsAction({ segment: JSON.parse(segmentKey) as unknown });
      // An older answer must not replace the count for the audience now chosen.
      if (requestId !== latestEstimate.current) return;
      setEstimate(
        result.ok
          ? { key: segmentKey, status: "done", estimate: result.data }
          : { key: segmentKey, status: "error", message: result.error.message },
      );
    }, ESTIMATE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [segmentKey]);

  const trimmedQuery = userQuery.trim();
  const searching = audience === "user" && !user && canSearchUsers && trimmedQuery.length >= SEARCH_MIN_LENGTH;
  useEffect(() => {
    if (!searching) return;
    const requestId = ++latestSearch.current;
    const timer = setTimeout(async () => {
      const result = await listUsersAction({ query: trimmedQuery, limit: SEARCH_LIMIT, offset: 0 });
      if (requestId !== latestSearch.current) return;
      setSearch(
        result.ok
          ? { query: trimmedQuery, status: "done", users: result.data }
          : { query: trimmedQuery, status: "error", message: result.error.message },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searching, trimmedQuery]);

  const currentSearch = search && search.query === trimmedQuery ? search : null;
  const currentEstimate = estimate && estimate.key === segmentKey ? estimate : null;

  function changeAudience(next: Audience) {
    setAudience(next);
    setError(null);
    // A screen for the other role would not open for these recipients.
    if (!routesForAudience(next, next === "user" ? (user?.platform_role ?? null) : null).some((r) => r.path === route)) {
      setRoute(NO_ROUTE);
    }
  }

  function chooseUser(next: AdminUserRow | null) {
    setUser(next);
    setUserQuery("");
    setSearch(null);
    if (next && !routesForAudience("user", next.platform_role).some((r) => r.path === route)) {
      setRoute(NO_ROUTE);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!segment) {
      setError("Choose the person who receives it.");
      return;
    }
    if (nobody) {
      setError(`${NO_RECIPIENTS}. Choose another audience.`);
      return;
    }
    const input: SendAnnouncementInput = {
      segment,
      title,
      body,
      route: route === NO_ROUTE ? null : route,
    };
    const parsed = sendAnnouncementSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the announcement and try again.");
      return;
    }
    setError(null);
    setConfirming(input);
  }

  function send() {
    if (!confirming) return;
    const input = confirming;
    startTransition(async () => {
      const result = await sendAnnouncementAction(input);
      if (!result.ok) {
        setError(result.error.message);
        setConfirming(null);
        showToast("error", result.error.message);
        return;
      }
      const sent = `Sent to ${peopleCount(result.data.recipientCount)}.`;
      setLastSent(sent);
      showToast("success", sent);
      setConfirming(null);
      setTitle("");
      setBody("");
      setRoute(NO_ROUTE);
    });
  }

  const exactCount = currentEstimate?.status === "done" ? currentEstimate.estimate.count : null;
  const nobody = exactCount === 0;

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-6">
        <fieldset className="flex flex-col gap-3" disabled={pending}>
          <legend className="mb-2 font-semibold">Who receives this</legend>
          <div className="flex flex-col gap-2">
            {AUDIENCES.map((value) => {
              const disabled = value === "user" && !canSearchUsers;
              return (
                <label
                  key={value}
                  className={
                    disabled
                      ? "flex items-center gap-2 text-sm text-muted-foreground"
                      : "flex items-center gap-2 text-sm"
                  }
                >
                  <input
                    type="radio"
                    name="audience"
                    value={value}
                    checked={audience === value}
                    disabled={disabled}
                    onChange={() => changeAudience(value)}
                    className="focus-ring size-4 accent-primary"
                  />
                  {AUDIENCE_LABELS[value]}
                </label>
              );
            })}
            {!canSearchUsers ? <p className="text-xs text-muted-foreground">{searchUsersReason}</p> : null}
          </div>

          {audience === "trainers" ? (
            <div className="flex max-w-sm flex-col gap-2">
              <Label htmlFor="announcement-city">City</Label>
              <Select value={city} onValueChange={setCity} disabled={pending}>
                <SelectTrigger id="announcement-city" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_CITY}>Every city</SelectItem>
                  {cities.map((choice) => (
                    <SelectItem key={choice.key} value={choice.label}>
                      {choice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {citiesError
                  ? `The cities could not be read: ${citiesError}`
                  : cities.length === 0
                    ? "No active cities in the catalogue yet."
                    : "Matched against the city on each trainer's application."}
              </p>
            </div>
          ) : null}

          {audience === "user" && canSearchUsers ? (
            user ? (
              <div className="flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{user.full_name || "Unnamed"}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[user.email ?? "No email", user.platform_role ?? "no app role", user.account_status].join(", ")}
                  </span>
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => chooseUser(null)}>
                  <X size={16} aria-hidden="true" />
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex max-w-xl flex-col gap-2">
                <Label htmlFor="announcement-user">Person</Label>
                <Input
                  id="announcement-user"
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="Search by name or email"
                  autoComplete="off"
                />
                {searching ? (
                  <div aria-live="polite" className="flex flex-col gap-1">
                    {!currentSearch ? (
                      <p className="text-xs text-muted-foreground">Searching...</p>
                    ) : currentSearch.status === "error" ? (
                      <p className="text-xs text-destructive">{currentSearch.message}</p>
                    ) : currentSearch.users.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No one matches &quot;{trimmedQuery}&quot;.</p>
                    ) : (
                      <ul className="flex flex-col divide-y rounded-lg border bg-card">
                        {currentSearch.users.map((row) => (
                          <li key={row.id}>
                            <button
                              type="button"
                              onClick={() => chooseUser(row)}
                              className="focus-ring flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                            >
                              <Users size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate">{row.full_name || "Unnamed"}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {row.email ?? "No email"}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Type at least {SEARCH_MIN_LENGTH} characters.</p>
                )}
              </div>
            )
          ) : null}

          <div aria-live="polite" className="rounded-lg border border-dashed px-4 py-3 text-sm">
            <span className="font-medium">Who receives this: </span>
            <span className="text-muted-foreground">
              {!segment
                ? "Choose the person first."
                : !currentEstimate
                  ? "Counting..."
                  : currentEstimate.status === "error"
                    ? currentEstimate.message
                    : estimateText(currentEstimate.estimate)}
            </span>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4" disabled={pending}>
          <legend className="mb-2 font-semibold">Message</legend>
          <div className="flex flex-col gap-2">
            <Label htmlFor="announcement-title">Title</Label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={ANNOUNCEMENT_TITLE_MAX}
              aria-describedby="announcement-title-count"
            />
            <p id="announcement-title-count" className="text-xs text-muted-foreground">
              {title.length} of {ANNOUNCEMENT_TITLE_MAX}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="announcement-body">Message</Label>
            <Textarea
              id="announcement-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={ANNOUNCEMENT_BODY_MAX}
              rows={5}
              aria-describedby="announcement-body-count"
            />
            <p id="announcement-body-count" className="text-xs text-muted-foreground">
              {body.length} of {ANNOUNCEMENT_BODY_MAX}
            </p>
          </div>
          <div className="flex max-w-sm flex-col gap-2">
            <Label htmlFor="announcement-route">Opens</Label>
            <Select value={route} onValueChange={setRoute} disabled={pending}>
              <SelectTrigger id="announcement-route" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ROUTE}>Nothing; it stays in the inbox</SelectItem>
                {routes.map((choice) => (
                  <SelectItem key={choice.path} value={choice.path}>
                    {choice.label} ({choice.path})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">The app screen a tap on the notification opens.</p>
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {lastSent ? (
          <p role="status" className="text-sm text-success">
            {lastSent}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || nobody} aria-describedby={nobody ? "announcement-nobody" : undefined}>
            <Send size={16} aria-hidden="true" />
            Review and send
          </Button>
          {nobody ? (
            <p id="announcement-nobody" className="text-sm text-muted-foreground">
              {NO_RECIPIENTS}.
            </p>
          ) : null}
        </div>
      </form>

      <Dialog open={confirming !== null} onOpenChange={(open) => (!open && !pending ? setConfirming(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {exactCount !== null ? `Send to ${peopleCount(exactCount)}?` : "Send this announcement?"}
            </DialogTitle>
            <DialogDescription>
              {audienceSummary(audience, city, user)}.{" "}
              {currentEstimate?.status === "done"
                ? estimateText(currentEstimate.estimate)
                : "The count did not load; the server counts the recipients when it sends."}{" "}
              It goes to each inbox at once and cannot be recalled.
            </DialogDescription>
          </DialogHeader>
          {confirming ? (
            <div className="flex flex-col gap-1 rounded-lg border bg-card px-4 py-3 text-sm">
              <span className="font-medium">{confirming.title.trim()}</span>
              <span className="whitespace-pre-line text-muted-foreground">{confirming.body.trim()}</span>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(null)} disabled={pending}>
              Back
            </Button>
            <Button type="button" onClick={send} disabled={pending || nobody}>
              {pending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

# Admin app architecture

Written with the scaffold on 2026-10-19 (AD-01, handoff
`../memory/.claude/handoffs/2026-10-19-e2e-and-admin/task-04.md`). The code is the source of
truth; whoever adds, renames or removes a route, feature, store, permission or data-layer
function fixes the matching row in the same change.

## Stack and versions

| Piece | Version / setting |
|---|---|
| Next.js | 16.4.2 (App Router, `src/`, Turbopack), from `create-next-app` 16.4.2 |
| React | 19.3.0 |
| TypeScript | 5.9, `strict` |
| Tailwind CSS | 4.3 through `@tailwindcss/turbopack` (configured in `next.config.ts`, no PostCSS file) |
| Cache Components | on (`cacheComponents: true`, `partialPrefetching: true`, scaffold default) |
| Supabase | `@supabase/supabase-js` 2.118, `@supabase/ssr` 0.12 |
| State, validation | Zustand 5, Zod 4 |
| Tests | Vitest 5 + jsdom + Testing Library, `vitest.config.mts`, `passWithNoTests` until AD-06 |
| UI primitives | shadcn/ui CLI 4.22 (`components.json`: style `new-york`, Radix base, base colour neutral, CSS variables, `rsc`); `radix-ui`, `class-variance-authority`, `cn` (shadcn's class merger, replaces clsx + tailwind-merge), `tw-animate-css`, `sonner`, `next-themes` (pulled in by the generated `sonner`, no provider mounted), `lucide-react` (generated files only) |
| Icons | `react-feather` 2.0, imported only through `src/components/icons.ts` |
| Motion, palette | `motion` 14.3 (`motion/react`: page fade, stagger, count-up, status pulse, sidebar indicator), `cmdk` 1.1 (behind the generated shadcn `command`); task 19 |
| Dev server | `npm run dev` on port 3100 |

## Request flow

1. `src/proxy.ts` (Next 16 renamed `middleware.ts` to `proxy.ts`) runs on every page and API
   request: refreshes the Supabase session cookie, sets the `x-admin-pathname` request header
   for the layout, and sends signed-out visitors to `/login` (API routes get a 401 JSON).
2. `src/app/(admin)/layout.tsx` wraps `AdminShell` in `<Suspense>` (Cache Components require
   request data behind a boundary). `AdminShell` resolves the session with
   `getSessionAccess()`, redirects (`/login`, `/login?reason=no-access`, `/forbidden`), applies
   `routePermission` to the current path, and renders the sidebar and header.
3. Every `(admin)` page calls `requireRoutePermission('<its pattern>')` too, because layouts
   do not re-render on client navigation. `src/app/(admin)/template.tsx` wraps each page in
   `FadeIn` (a template remounts per navigation, so every page fades in).
4. Mutations: client component -> server action -> Zod -> `requirePermission` ->
   `src/lib/db/rbac.ts` -> `rpc()` -> `refresh()`; errors come back as `ActionResult` and show
   as toasts. No optimistic state.

## Routes

| Route | File | Gate | Notes |
|---|---|---|---|
| `/` | `src/app/page.tsx` | none | Redirects to `/dashboard` or `/login` from the session. |
| `/login` | `src/app/(auth)/login/page.tsx` | public | Email + password; sign-in is refused (signed out, "This account has no admin role.") unless `hasPanelAccess`; `?reason=no-access` shows the same message. |
| `/dashboard` | `src/app/(admin)/dashboard/page.tsx` | open (any admin) | "Needs me now": six tiles (applications awaiting review `applications.read`, documents to review `documents.review`, open support cases `support.read`, bookings today and booking requests pending `bookings.read`, new users last 7 days `users.read`), each streamed in its own Suspense; a tile without its permission says which one it needs. Below: review queue (oldest five awaiting, `applications.read`) and activity (`admin_list_audit`, `audit.read`). |
| `/forbidden` | `src/app/(admin)/forbidden/page.tsx` | open (any admin) | Target of every failed route check. |
| `/roles` | `src/app/(admin)/roles/page.tsx` | `rbac.manage` | Table (Type badge, "Admin" panel-access badge for `is_admin`, toggle chips System / Custom / Grants panel access) and "New role" dialog; `?new=role` opens it (command palette). |
| `/roles/[id]` | `src/app/(admin)/roles/[id]/page.tsx` | `rbac.manage` | Details form (name, description, "Grants admin panel access"), permission grid, delete; all locked for system roles with the reason. |
| `/users` | `src/app/(admin)/users/page.tsx` | `users.read` | Debounced search, toggle chips over the loaded rows (joined last 7 days, trainers, clients, suspended, has admin roles); `?joined=week` pre-applies the first and loads 200 rows; "New user" (`users.manage`, needs the service role key), `?new=user` opens it. |
| `/users/[id]` | `src/app/(admin)/users/[id]/page.tsx` | `users.read` | Roles assign/revoke and "Grant trainer app access" (`users.manage`). |
| `/applications` | `src/app/(admin)/applications/page.tsx` | `applications.read` | Status chips (`?status=`, all = every non-draft), quick filters `?status=awaiting_review` (submitted + under review, oldest first) and `?documents=unreviewed` (trainers with an uploaded document; needs `documents.review`, else ignored with a note), clear all; sortable name, @username (needs `users.read`, else "Hidden"), city, modes, submitted, status; 200 rows max with a note. |
| `/applications/[trainerId]` | `src/app/(admin)/applications/[trainerId]/page.tsx` | `applications.read` | Status timeline (draft, submitted, under review, needs information, decision; times from `created_at`, `submitted_at`, `updated_at`), answers (profile, experience, services and expected rates, availability, documents). Documents section needs `documents.review`; decision form needs `applications.review`; each says why when missing. |
| `POST /api/users/create` | `src/app/api/users/create/route.ts` | `users.manage` | 503 "Service role key not configured" without the key; creates a confirmed auth user, then assigns roles with the caller's session. |
| loading state | `src/app/(admin)/loading.tsx` | - | Page-level Suspense fallback. |
| page transition | `src/app/(admin)/template.tsx` | - | `FadeIn` around every page (fade and 8px rise, 180 ms). |

## Permission registry (`src/lib/rbac/`)

| File | Exports |
|---|---|
| `permissions.ts` | `PERMISSION_GROUPS`, `PERMISSIONS` (`{ key, group, name, routes, apis, components }`), `PermissionKey`, `isPermissionKey`, `OPEN_ADMIN_ROUTES`, `routePermission(pathname)` (`{kind:'open'}`, `{kind:'permission', key}` or `null` for unknown paths, treated as forbidden), `apiPermission`, `navItems`, `permissionsInGroup`. The only list of permission keys in `src/`. |
| `can.ts` | `can(permissions, key)`; `hasPanelAccess(access)`: `admin_access` true and at least one permission (the fallback). Used by sign-in and `getSessionAccess`. |
| `session.ts` | `getSessionAccess()` (React `cache`, once per request): `anonymous`, `no-access` (fails `hasPanelAccess`), `error` or `ok` with `SessionAccess` from `my_access()` (`adminAccess`, `roles[{id, key, name, isAdmin}]`, `permissions`). |
| `require-permission.ts` | `ForbiddenError`, `requirePermission(key)` (throws; actions and route handlers), `requireRoutePermission(pattern)` (redirects; pages). |

| Key | Group | Routes | APIs | Components |
|---|---|---|---|---|
| `rbac.manage` | rbac | `/roles`, `/roles/[id]` | | create-role-dialog, role-form, permission-grid, delete-role-button |
| `users.read` | users | `/users`, `/users/[id]` | | user-search |
| `users.manage` | users | | `/api/users/create` | user-roles-panel, grant-trainer-access, create-user-dialog |
| `applications.read` | applications | `/applications`, `/applications/[trainerId]` | | application-table, application-detail |
| `applications.review` | applications | | | decision-form (`reviewApplicationAction`) |
| `documents.review` | applications | | | document-list, document-verdict-dialog (`openDocumentAction`, `reviewDocumentAction`) |
| `support.read`, `support.manage`, `bookings.read`, `reviews.moderate`, `audit.read` | their own | none yet (AD-04, AD-05) | | |

## Data layer (`src/lib/db/`)

`rbac.ts`, `applications.ts` and `dashboard.ts` are the only files that spell table, bucket or function names (the hand-written types in
`src/types/database.ts` name them as types). Built against the task 05 contract (approved 2026-10-19),
which is not applied yet; every call fails today with `NOT_INSTALLED`.

| Wrapper | Calls |
|---|---|
| `getMyAccess` | `rpc('my_access')`, validated with Zod; a missing `admin_access` or `roles[].is_admin` reads as false |
| `listRoles`, `countRoles`, `getRole` | `roles`, `role_permissions` selects |
| `createRole`, `updateRole`, `deleteRole`, `setRolePermissions` | `admin_create_role(p_key, p_name, p_description, p_is_admin)`, `admin_update_role(p_id, p_name, p_description, p_is_admin)`, `admin_delete_role`, `admin_set_role_permissions` |
| `listUsers`, `countUsers`, `getUser` | `admin_list_users` (count uses `p_limit => null`), `admin_get_user` |
| `listUserRoleGrants` | `user_roles` select |
| `assignRole`, `revokeRole`, `setPlatformRole` | `admin_assign_role`, `admin_revoke_role`, `admin_set_platform_role` |

`applications.ts` (reads run through RLS: `applications.read` for applications, `documents.review` for documents and the bucket):

| Wrapper | Calls |
|---|---|
| `listApplications`, `getApplication`, `getApplicationModes` | `trainer_applications` selects (drafts never listed); `listApplications({ statuses, trainerIds, limit, oldestFirst })` |
| `countApplications`, `listApplicantNames` | `trainer_applications` head count by statuses; names by trainer ids (activity feed) |
| `countUnreviewedDocuments`, `listTrainerIdsWithUnreviewedDocuments` | `trainer_documents` with `status = 'uploaded'` (head count; distinct trainer ids, scan capped at 1000) |
| `listDocuments` | `trainer_documents` select without `storage_path` (the path never reaches the client) |
| `listAvailability` | `availability_windows` select |
| `createDocumentSignedUrl` | path looked up by document id, then `storage.from('trainer-documents').createSignedUrl(path, 300)` with the admin's session |
| `reviewApplication` | `review_application(p_trainer, p_status, p_note, p_home_rate_inr, p_online_rate_inr, p_verified_checks, p_availability_tags => null)` |
| `reviewDocument` | `review_document(p_document, p_status, p_note)` |

`dashboard.ts` (reads with the admin's session):

| Wrapper | Calls |
|---|---|
| `countOpenSupportCases` | `support_cases` head count, status open / triaged / waiting_for_user / investigating / escalated (RLS: `support.read`) |
| `countBookingsStarting`, `countPendingBookingRequests` | `bookings` head counts: start in a range and not cancelled; status `requested` (RLS still `private.is_admin()`; the panel gates on `bookings.read`) |
| `listAudit` | `admin_list_audit(p_limit, p_offset)` (`audit.read`) |

## Supabase and errors (`src/lib/supabase/`, `src/server/`)

| File | Role |
|---|---|
| `env.ts` | `readSupabasePublicEnv()`: the two `NEXT_PUBLIC_` values or null. |
| `client.ts` | `createSupabaseBrowserClient()` (not used yet; sign-in runs server-side). |
| `server.ts` | `createSupabaseServerClient()` (cookies), `AppSupabaseClient` type. |
| `errors.ts` | `AppError`, `toAppError`, `errorPayload`: `BRVAL`, `BRPRM`, `BRNTF`, `BRSLT` from `private.fail`; `NOT_INSTALLED` (PGRST202, PGRST205, 42P01, 42883); `AUTH`, `CONFIG`, `SERVICE_ROLE_MISSING`, `NETWORK`, `UNKNOWN`. Messages live here only. |
| `src/server/service-client.ts` | `isServiceRoleConfigured()`, `createServiceClient()`, `ServiceRoleMissingError`. Only reader of `SUPABASE_SERVICE_ROLE_KEY`. |
| `src/server/run-action.ts` | `runAction(schema, input, permission, run)`: the path every server action takes. |

## Features

| Feature | Files |
|---|---|
| auth | `src/features/auth/{actions.ts (signInAction, signOutAction), schemas.ts, components/login-form.tsx}` |
| roles | `src/features/roles/{actions.ts, schemas.ts, components/{create-role-dialog, role-table, role-form, permission-grid, delete-role-button}.tsx}` |
| users | `src/features/users/{actions.ts, schemas.ts (USER_PAGE_SIZE 50, USER_MAX_PAGE 200, USER_FILTERS, parseUserFilters), components/{user-search (search + toggle chips), user-table (client, DataTable), user-roles-panel, grant-trainer-access, create-user-dialog}.tsx}` |
| dashboard | `src/features/dashboard/{api.ts (loadDashboardTiles, loadReviewQueue, loadActivity: server loaders, each settles on its own), format.ts (describeAuditEntry: audit row to verb and target link, gated by permission), components/{stat-tiles, review-queue, activity-feed, section-skeleton}.tsx}` |
| applications | `src/features/applications/{api.ts (loadApplicationList with the documents filter state, loadApplicationDetail: server loaders, usernames via admin_get_user only with users.read), actions.ts (reviewApplicationAction, reviewDocumentAction, openDocumentAction), schemas.ts (status filters, quick filter awaiting_review, filterStatuses, parseDocumentsFilter, applicationListHref, decisions, verified checks, labels, missingPriceMessage), format.ts (INR, bytes, times, status tones), components/{application-table (client, DataTable), application-detail, status-timeline, document-list, document-verdict-dialog, decision-form}.tsx}`. Approval needs a platform price for every offered mode: checked in the form and again in the action against the modes read from the database. |

## Stores (`src/stores/`)

| Store | Holds |
|---|---|
| `session-store.ts` + `session-store-provider.tsx` | `access`, `setAccess`, `clear`. One store per request tree via context (a module singleton would share one admin's access across server renders). Read with `useSessionStore`. |
| `command-store.ts` | `paletteOpen`, `shortcutsOpen` and setters (opening one closes the other). A module store: UI state only, changed only by browser events. |
| `toast-store.ts` | Not a store any more: `showToast(tone, message)` is a thin wrapper over sonner's `toast`, kept so features never import sonner directly. |

## Shared components

| Path | Components |
|---|---|
| `src/components/ui/` | CLI-generated shadcn/ui, not edited by hand: `button`, `input`, `label`, `select` (Radix), `checkbox` (Radix; renders a hidden input inside a form), `badge`, `table`, `dialog` (Radix), `dropdown-menu`, `textarea`, `sonner` (`Toaster`, mounted in the root layout with `theme="dark"`), `skeleton`, `separator`, `card`, `command` (cmdk), `sheet`, `kbd` (task 19). The one hand-written file is `empty-state` (a dashed `Card`; shadcn has none). Status badges are `variant="outline"` plus `border-success text-success`, `border-warning text-warning`, `border-destructive text-destructive` or `text-muted-foreground`. |
| `src/components/icons.ts` | Named re-exports of the `react-feather` icons we place (size 16 or 18, stroke 2). Nothing outside `src/components/ui` imports `lucide-react`. |
| `src/lib/utils.ts` | `cn` (CLI-generated; re-exports the `cn` package). Replaces the old `src/lib/utils/cn.ts`. |
| `src/components/rbac/can.tsx` | `<Can permission fallback>` (client) |
| `src/components/layout/` | `admin-shell` (server: sidebar, backdrop, topbar, palette, sheet, shortcuts), `sidebar-nav` (motion `layoutId` active indicator, "g x" hints), `topbar` (breadcrumbs, palette trigger, "?" button, name and roles, sign out; mobile nav), `breadcrumbs` (from the path), `command-palette` (cmdk: permitted pages, quick filters, debounced `listUsersAction` user search with `users.read`, New role `rbac.manage`, Invite user `users.manage` disabled with the reason without the service role key), `shortcut-sheet`, `global-shortcuts` (the one window key listener), `page-header` (back link, eyebrow, h1, status, description, actions), `sign-out-button`, `use-apple-platform` |
| `src/components/data-table/` | `data-table` (client: sticky header, in-memory sort with `aria-sort`, result count, hover quick actions, j/k or arrows and Enter on rows, skeleton rows, empty state, first-paint stagger), `filter-chips` (link or toggle chips, clear all) |
| `src/components/motion/` | `fade-in`, `stagger-list` (`StaggerList`, `StaggerItem`; 40 ms, first paint only), `count-up` (600 ms ease-out; markup always holds the real value), `status-pulse` (one ring when the value changes after a server response), `use-reduced-motion` (live `matchMedia`, so tests can toggle it). Every one renders the final state under `prefers-reduced-motion`; animated elements carry `data-motion` so the CSS override in `globals.css` applies before scripts run. |
| `src/components/art/` | `silhouettes` (runner, boxer, kettlebell swing, plank, dumbbell, jump rope as single-stroke `<g>` glyphs on a 64 grid, `currentColor`; `Silhouette` for standalone use), `backdrop` (one SVG pattern of the glyphs with rotation and scale variance at `BACKDROP_OPACITY` 0.045 plus the accent glow top-left; `aria-hidden`, `pointer-events: none`, behind the content column; contrast worked in the file comment, darkest text 5.7:1 at the lightest spot) |
| `src/lib/shortcuts.ts` | `SHORTCUTS`, `SHORTCUT_GROUPS`, `GO_TO_TARGETS` (g then d/a/u/r), `matchShortcut(input, state, now, typing)` (pure; Mod+K, "/", "?", "g" sequence within `SEQUENCE_TIMEOUT_MS`, j/k), `isTypingTarget`, `keyLabel` |
| `src/lib/utils/time.ts` | `currentTime`, `daysAgoIso`, `istDayRange`, `istHour`, `formatRelativeTime`, `formatWaiting` (India time; the clock is read here, not in components) |

## Theme

`src/app/globals.css` defines the shadcn variables once, in `:root`, with the brand values; dark
is the only theme (`<html class="dark">` turns on the generated components' `dark:` variants;
there is no light set and no `.dark` block). `background #161616`, `foreground`, `card`
(surface), `popover` (raised surface), `primary #FF5656` with `primary-foreground #161616`
(4.5:1; primary actions and the active nav item only), `secondary`, `muted`, `accent` (in
shadcn this is the neutral hover surface, not the brand accent), `muted-foreground`,
`destructive`, `border`, `input` (stronger border), `ring #FF5656`, plus `success` and
`warning`; `--radius 0.5rem`. Task 19 adds `surface-raised` (hovered rows and tiles), `shadow-tile`
and `shadow-tile-hover`, `glow` (accent at 14%, used by the `glow-radial` utility), the
`focus-ring` utility (2px `ring` outline, 2px offset), dialogs entering from scale 0.98, and a
`prefers-reduced-motion` block that ends every animation at once and shows `[data-motion]`
elements in their final state. `@theme inline` maps them to utilities; the default Tailwind
palette is cleared except `white` and `black`, which the generated overlay and destructive
styles use. Montserrat through `next/font/google` as `--font-sans`.

## Environment

`.env.example` (committed, un-ignored in `.gitignore`): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY=` (server only).
`.env.local` holds the same with the public values filled; gitignored.

Hosted: Vercel project `app-admin-nextjs` (team `purvikbrutal`), `main` to
https://admin.brutal.fit (production), `dev` to https://admin-dev.brutal.fit (preview pinned
to the branch). The two public variables are set for Production and Preview; the service role
key is not set. With `cacheComponents` on, `/roles/[id]` runs its session gate during the build
prerender, so a missing public variable fails the build instead of the request (see README,
Deploy).

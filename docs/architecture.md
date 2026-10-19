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
   do not re-render on client navigation.
4. Mutations: client component -> server action -> Zod -> `requirePermission` ->
   `src/lib/db/rbac.ts` -> `rpc()` -> `refresh()`; errors come back as `ActionResult` and show
   as toasts. No optimistic state.

## Routes

| Route | File | Gate | Notes |
|---|---|---|---|
| `/` | `src/app/page.tsx` | none | Redirects to `/dashboard` or `/login` from the session. |
| `/login` | `src/app/(auth)/login/page.tsx` | public | Email + password; sign-in is refused (signed out, "This account has no admin role.") unless `hasPanelAccess`; `?reason=no-access` shows the same message. |
| `/dashboard` | `src/app/(admin)/dashboard/page.tsx` | open (any admin) | Counts: users (`users.read`), roles. Failures show the mapped error. |
| `/forbidden` | `src/app/(admin)/forbidden/page.tsx` | open (any admin) | Target of every failed route check. |
| `/roles` | `src/app/(admin)/roles/page.tsx` | `rbac.manage` | Table (Type badge, "Admin" panel-access badge for `is_admin`) and "New role" dialog. |
| `/roles/[id]` | `src/app/(admin)/roles/[id]/page.tsx` | `rbac.manage` | Details form (name, description, "Grants admin panel access"), permission grid, delete; all locked for system roles with the reason. |
| `/users` | `src/app/(admin)/users/page.tsx` | `users.read` | Debounced search; "New user" (`users.manage`, needs the service role key). |
| `/users/[id]` | `src/app/(admin)/users/[id]/page.tsx` | `users.read` | Roles assign/revoke and "Grant trainer app access" (`users.manage`). |
| `POST /api/users/create` | `src/app/api/users/create/route.ts` | `users.manage` | 503 "Service role key not configured" without the key; creates a confirmed auth user, then assigns roles with the caller's session. |
| loading state | `src/app/(admin)/loading.tsx` | - | Page-level Suspense fallback. |

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
| `applications.read`, `applications.review`, `documents.review`, `support.read`, `support.manage`, `bookings.read`, `reviews.moderate`, `audit.read` | their own (`documents.review` is in `applications`, as seeded) | none yet (AD-03 to AD-05) | | |

## Data layer (`src/lib/db/rbac.ts`)

The only file that spells table or function names (the hand-written types in
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
| users | `src/features/users/{actions.ts, schemas.ts, components/{user-search, user-table, user-roles-panel, grant-trainer-access, create-user-dialog}.tsx}` |

## Stores (`src/stores/`)

| Store | Holds |
|---|---|
| `session-store.ts` + `session-store-provider.tsx` | `access`, `setAccess`, `clear`. One store per request tree via context (a module singleton would share one admin's access across server renders). Read with `useSessionStore`. |
| `toast-store.ts` | Not a store any more: `showToast(tone, message)` is a thin wrapper over sonner's `toast`, kept so features never import sonner directly. |

## Shared components

| Path | Components |
|---|---|
| `src/components/ui/` | CLI-generated shadcn/ui, not edited by hand: `button`, `input`, `label`, `select` (Radix), `checkbox` (Radix; renders a hidden input inside a form), `badge`, `table`, `dialog` (Radix), `dropdown-menu`, `sonner` (`Toaster`, mounted in the root layout with `theme="dark"`), `skeleton`, `separator`, `card`. The one hand-written file is `empty-state` (a dashed `Card`; shadcn has none). Status badges are `variant="outline"` plus `border-success text-success`, `border-warning text-warning`, `border-destructive text-destructive` or `text-muted-foreground`. |
| `src/components/icons.ts` | Named re-exports of the `react-feather` icons we place (size 16 or 18, stroke 2). Nothing outside `src/components/ui` imports `lucide-react`. |
| `src/lib/utils.ts` | `cn` (CLI-generated; re-exports the `cn` package). Replaces the old `src/lib/utils/cn.ts`. |
| `src/components/rbac/can.tsx` | `<Can permission fallback>` (client) |
| `src/components/layout/` | `admin-shell` (server), `sidebar-nav`, `sign-out-button` |

## Theme

`src/app/globals.css` defines the shadcn variables once, in `:root`, with the brand values; dark
is the only theme (`<html class="dark">` turns on the generated components' `dark:` variants;
there is no light set and no `.dark` block). `background #161616`, `foreground`, `card`
(surface), `popover` (raised surface), `primary #FF5656` with `primary-foreground #161616`
(4.5:1; primary actions and the active nav item only), `secondary`, `muted`, `accent` (in
shadcn this is the neutral hover surface, not the brand accent), `muted-foreground`,
`destructive`, `border`, `input` (stronger border), `ring #FF5656`, plus `success` and
`warning`; `--radius 0.5rem`. `@theme inline` maps them to utilities; the default Tailwind
palette is cleared except `white` and `black`, which the generated overlay and destructive
styles use. Montserrat through `next/font/google` as `--font-sans`.

## Environment

`.env.example` (committed, un-ignored in `.gitignore`): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY=` (server only).
`.env.local` holds the same with the public values filled; gitignored.

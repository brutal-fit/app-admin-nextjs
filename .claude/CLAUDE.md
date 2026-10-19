# BRUTAL admin app (app-admin-nextjs)

The internal admin panel for BRUTAL staff: review trainer applications and documents, set
platform prices, handle support, manage users, and manage roles and permissions (RBAC). It
talks to the same Supabase project as the Flutter app. Admins sign in here; clients and
trainers sign in to the Flutter app. One person can be both.

- Product reference: `../app-fe-flutter/docs/product.md`. Server rules and the schema map:
  `../app-be-supabase/docs/architecture.md`. Current state: `../memory/current.md`, always.
- Workspace rules, agents, `/build` and handoff packages: `../memory/.claude/` (linked from
  the parent `Brutal/.claude`).

## Repo rules

- Branches `main` and `dev`; work and checkpoint commits on `dev`. Checked-out branch only; no
  worktrees, no new branches unless the owner asks. Commits proposed to the owner and made
  after a yes (or under a standing instruction to commit and push); no `Co-Authored-By` or
  other trailers; never push unless asked.
- Owner instructions given during a session are recorded in `../memory/instructions.md`.
- Changes under `src/`, `middleware.ts`, `next.config.*`, `package.json` dependencies and
  `public/` go to the `developer` agent with a handoff package. The Architect edits this file,
  `README.md`, `docs/`, `.env.example` and `.claude/` directly.
- Secrets: only `NEXT_PUBLIC_SUPABASE_URL` and the publishable key may be committed (in
  `.env.example`). `SUPABASE_SERVICE_ROLE_KEY` lives only in the gitignored `.env.local` and is
  read only in server code under `src/server/`. Never in a client component, never logged.

## Stack

Next.js (App Router, `src/` directory, Turbopack), TypeScript strict, React, Tailwind CSS v4,
Zustand for client state, `@supabase/supabase-js` + `@supabase/ssr` for auth and data, Zod for
every input that crosses a boundary. UI components come from shadcn/ui (owner, 2026-10-19),
generated into `src/components/ui` with the CLI and themed through the brand tokens in
`globals.css`; hand-written components only where shadcn has none. Icons we place come from `react-feather`
(owner, 2026-10-19), imported through `src/components/icons.ts`; shadcn's generated files keep
their `lucide-react` icons. Adding any other
dependency is a decision proposed to the owner first.

## Toolchain

Node comes from nvm and is not on PATH in non-interactive shells: start every shell command
with `source ~/.zshrc` (owner, 2026-10-19). Supabase CLI is `npx supabase`, never a global
install (owner, 2026-10-19). Commands run from this repo's root:

| Purpose | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` (port 3100, so it never collides with another project's 3000) |
| Lint, types, build | `npm run lint && npx tsc --noEmit && npm run build` |
| Tests | `npm test` (Vitest, once tests exist) |
| DB types | `npx supabase gen types typescript --project-id apmoxeqbqgjmrrojwgjw --schema public > src/types/database.ts` (needs `npx supabase login`; until then the types are hand-written and marked so) |

## Non-negotiable rules

- **The server decides.** Approvals, prices, statuses and role grants change only through the
  Postgres functions in `../app-be-supabase`. The panel calls `rpc()` and renders what comes
  back; no optimistic state, no client-side status writes.
- **RBAC gates everything twice.** Every route, nav item, action button and API route is
  gated by a permission key from `src/lib/rbac/permissions.ts`, and the database enforces the
  same key through `private.has_permission()`. A permission that exists in only one place is
  a bug. The registry is the single list of permission keys on the client; it must match the
  `permissions` table (a test asserts it).
- **Honest UI.** Counts come from queries. Disabled features say why ("Service role key not
  configured") instead of failing silently.
- **Private data stays private.** Trainer documents open through short-lived signed URLs,
  never public URLs. Session addresses, support details and private notes are shown only on
  screens gated by the matching permission, and never logged.
- **Accessible, plain, dark.** Brand tokens from the Flutter app (`#161616` background,
  `#FF5656` accent, Montserrat) as Tailwind theme tokens in `src/app/globals.css`; no hex
  values in components. Keyboard reachable, visible focus, 4.5:1 contrast.
- **House style.** No em-dashes, no emoji, plain ASCII in code, copy and docs. Comments say why,
  never who asked.

## Conventions

- Folders: `src/app` (routes only: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, thin),
  `src/features/<feature>/{components,hooks,api.ts,schemas.ts}` (feature code),
  `src/components/{ui,layout}` (shared), `src/lib/{supabase,rbac,utils}` (infrastructure),
  `src/server/` (server-only code: service-role client, route helpers), `src/stores/`
  (Zustand), `src/types/` (database and shared types).
- Files kebab-case (`role-form.tsx`, `use-permissions.ts`); components and types PascalCase;
  functions and variables camelCase; constants UPPER_SNAKE only for true constants; one
  exported component per file; named exports everywhere except Next.js pages and layouts.
- Server components by default; `"use client"` only on leaves that need state or events.
  Data loading in server components or route handlers through the server Supabase client;
  mutations through server actions or route handlers that validate with Zod and check the
  permission first.
- Zustand stores hold session state (user, roles, permissions) and UI state only, never
  server data caches.
- Errors: the SQLSTATE contract from the backend (`BRVAL`, `BRPRM`, `BRNTF`, `BRSLT`) is mapped
  in `src/lib/supabase/errors.ts` to typed errors and friendly messages, in one place.
- No `any`, no non-null assertions without a comment saying why, no barrel files that
  re-export whole folders.

## Memory and docs

`../memory/` is the shared running memory (read `current.md` first, write it last; one `log.md`
entry per session). This repo's `docs/architecture.md` lists routes, features, stores and the
permission registry; whoever adds or renames one fixes the row in the same change.
`docs/backlog.md` is the map of what is left.
